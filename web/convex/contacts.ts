import { query } from "./_generated/server";
import { getAuthenticatedUser } from "./authHelpers";

/**
 * Get all unique team members (collaborators) from the user's events
 * Returns deduplicated contacts with their associated events
 */
export const listMyTeamContacts = query({
  args: {},
  handler: async (ctx) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Get all events where user is a member
    const userEventMemberships = await ctx.db
      .query("eventMembers")
      .withIndex("by_user", (q) => q.eq("userId", userProfile._id))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    const eventIds = userEventMemberships.map((m) => m.eventId);

    // Get all event members from these events (excluding the current user)
    const allEventMembers = await Promise.all(
      eventIds.map(async (eventId) => {
        const members = await ctx.db
          .query("eventMembers")
          .withIndex("by_event", (q) => q.eq("eventId", eventId))
          .filter((q) => q.eq(q.field("isDeleted"), false))
          .collect();

        // Filter out the current user
        return members.filter((m) => m.userId !== userProfile._id);
      })
    );

    const flatMembers = allEventMembers.flat();

    // Deduplicate by userId and enrich with user and event data
    const contactsMap = new Map<string, any>();

    for (const member of flatMembers) {
      const userId = member.userId;

      if (!contactsMap.has(userId)) {
        const user = await ctx.db.get(member.userId);
        if (!user || !user.isActive) continue; // Skip inactive users

        const event = await ctx.db.get(member.eventId);
        if (!event || event.deletedAt !== undefined) continue; // Skip deleted events

        contactsMap.set(userId, {
          userId: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          bio: user.bio,
          location: user.location,
          role: member.role,
          joinedAt: member.joinedAt,
          events: [
            {
              eventId: event._id,
              eventName: event.name,
              role: member.role,
              joinedAt: member.joinedAt,
            },
          ],
        });
      } else {
        // User already exists, add this event to their event list
        const event = await ctx.db.get(member.eventId);
        if (!event || event.deletedAt !== undefined) continue;

        const contact = contactsMap.get(userId);
        // Check if this event is already in the list
        const eventExists = contact.events.some(
          (e: any) => e.eventId === event._id
        );

        if (!eventExists) {
          contact.events.push({
            eventId: event._id,
            eventName: event.name,
            role: member.role,
            joinedAt: member.joinedAt,
          });
        }
      }
    }

    // Convert map to array and sort by most recently joined
    const contacts = Array.from(contactsMap.values()).sort(
      (a, b) => b.joinedAt - a.joinedAt
    );

    return contacts;
  },
});

/**
 * Get all vendors from the user's events
 * Returns vendors with their associated event information
 */
export const listMyVendorContacts = query({
  args: {},
  handler: async (ctx) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Get all events where user is a member
    const userEventMemberships = await ctx.db
      .query("eventMembers")
      .withIndex("by_user", (q) => q.eq("userId", userProfile._id))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    const eventIds = userEventMemberships.map((m) => m.eventId);

    // Get all vendors from these events
    const allVendors = await Promise.all(
      eventIds.map(async (eventId) => {
        const vendors = await ctx.db
          .query("vendors")
          .withIndex("by_event", (q) => q.eq("eventId", eventId))
          .filter((q) => q.eq(q.field("deletedAt"), undefined))
          .collect();

        return vendors;
      })
    );

    const flatVendors = allVendors.flat();

    // Enrich vendors with event data
    const vendorContacts = await Promise.all(
      flatVendors.map(async (vendor) => {
        const event = await ctx.db.get(vendor.eventId!);
        if (!event || event.deletedAt !== undefined) return null;

        return {
          vendorId: vendor._id,
          name: vendor.name,
          category: vendor.category,
          description: vendor.description,
          email: vendor.email,
          phone: vendor.phone,
          website: vendor.website,
          city: vendor.city,
          state: vendor.state,
          country: vendor.country,
          pricing: vendor.pricing,
          rating: vendor.rating,
          status: vendor.status,
          eventId: event._id,
          eventName: event.name,
          addedAt: vendor.createdAt,
          updatedAt: vendor.updatedAt,
        };
      })
    );

    // Filter out null values and sort by most recently added
    const contacts = vendorContacts
      .filter((v): v is NonNullable<typeof v> => v !== null)
      .sort((a, b) => b.addedAt - a.addedAt);

    return contacts;
  },
});
