# Presence Component Implementation Guide

## Overview

### What It Does
The Presence component provides real-time user presence tracking for our event management system. It enables:
- Live indication of which users are currently viewing/active in event rooms
- Last seen timestamps for offline users
- Efficient heartbeat mechanism without polling
- Automatic cleanup when users disconnect

### Why We Need It
Our event planning app has real-time chat rooms where coordinators, collaborators, and vendors communicate. Knowing who is currently active in a room helps:
- Improve communication (know when someone is available to respond)
- Create a more engaging collaborative experience
- Show typing indicators and active participant lists
- Provide accountability for coordinators managing events

### Use Cases in Our App
1. **Room Presence**: Display active users in each event chat room
2. **Event Dashboard**: Show which team members are currently online for an event
3. **Vendor Availability**: Indicate when vendors are active in vendor-specific rooms
4. **Coordinator Status**: Let collaborators know when the main coordinator is available

---

## Installation Steps

### 1. Install the Package
```bash
cd /Users/aaryareddy/Projects/delphi/web
npm install @convex-dev/presence
```

### 2. Update Convex Configuration
Edit `convex/convex.config.ts`:

```typescript
import { defineApp } from "convex/server";
import betterAuth from "@convex-dev/better-auth/convex.config";
import presence from "@convex-dev/presence/convex.config";

const app = defineApp();
app.use(betterAuth);
app.use(presence);

export default app;
```

### 3. Run Development Server
```bash
npx convex dev
```

This will register the component and generate necessary code.

---

## Integration Points

### Where This Component Will Be Used

1. **Room Chat Interface** (`web/src/routes/_authed/events.$eventId.rooms.$roomId.tsx`)
   - Display active participants in the current room
   - Show who is typing
   - FacePile component showing user avatars

2. **Room Sidebar** (`web/src/routes/_authed/events.$eventId.rooms.index.tsx`)
   - Badge indicators for rooms with active users
   - Quick glance at room activity levels

3. **Event Overview** (`web/src/routes/_authed/events.$eventId.tsx`)
   - Dashboard widget showing all active team members
   - Real-time collaboration indicators

4. **Vendor Rooms**
   - Show when vendors are online in their dedicated rooms
   - Help coordinators know best times to communicate

---

## Code Examples

### Backend Implementation

Create `web/convex/presence.ts`:

```typescript
import { components } from "./_generated/api";
import { Presence } from "@convex-dev/presence";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUser, requireRoomParticipant } from "./authHelpers";

// Initialize the Presence component
export const presence = new Presence(components.presence, {
  // Optional: customize presence expiry (default is 60 seconds)
  expiresIn: 45000, // 45 seconds
});

/**
 * Update user presence in a room
 * Called periodically by the client (heartbeat)
 */
export const updatePresence = mutation({
  args: {
    roomId: v.id("rooms"),
    data: v.optional(v.object({
      status: v.optional(v.union(
        v.literal("active"),
        v.literal("idle"),
        v.literal("typing")
      )),
    })),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);
    
    // Verify user is a room participant
    await requireRoomParticipant(ctx, args.roomId, userProfile._id);
    
    // Update presence with room as the location
    await presence.heartbeat(ctx, args.roomId, {
      userId: userProfile._id,
      userName: userProfile.name,
      userAvatar: userProfile.avatar,
      data: args.data || {},
    });
  },
});

/**
 * List all users present in a room
 */
export const listPresence = query({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);
    
    // Verify user is a room participant
    await requireRoomParticipant(ctx, args.roomId, userProfile._id);
    
    // Get all present users in this room
    const presentUsers = await presence.list(ctx, args.roomId);
    
    return presentUsers;
  },
});

/**
 * Get presence for a specific user across all rooms
 */
export const getUserPresence = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await getAuthenticatedUser(ctx);
    
    // Check if user is online in any room
    const userPresence = await presence.listUser(ctx, args.userId);
    
    return userPresence;
  },
});

/**
 * Handle user leaving a room
 */
export const leaveRoom = mutation({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);
    
    // Remove user from presence tracking
    await presence.disconnect(ctx, args.roomId, userProfile._id);
  },
});

/**
 * Get aggregated presence stats for an event
 */
export const getEventPresence = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);
    
    // Get all rooms for this event
    const rooms = await ctx.db
      .query("rooms")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();
    
    // Get presence for each room
    const roomPresence = await Promise.all(
      rooms.map(async (room) => {
        const present = await presence.list(ctx, room._id);
        return {
          roomId: room._id,
          roomName: room.name,
          activeUsers: present,
          activeCount: present.length,
        };
      })
    );
    
    // Count unique users across all rooms
    const uniqueUsers = new Set(
      roomPresence.flatMap((rp) => rp.activeUsers.map((u) => u.userId))
    );
    
    return {
      rooms: roomPresence,
      totalActiveUsers: uniqueUsers.size,
    };
  },
});
```

### Frontend Hook

Create `web/src/hooks/useRoomPresence.ts`:

```typescript
import { useEffect, useCallback, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const HEARTBEAT_INTERVAL = 30000; // 30 seconds

export function useRoomPresence(roomId: Id<"rooms"> | undefined) {
  const updatePresence = useMutation(api.presence.updatePresence);
  const leaveRoom = useMutation(api.presence.leaveRoom);
  const presentUsers = useQuery(
    api.presence.listPresence,
    roomId ? { roomId } : "skip"
  );
  
  const intervalRef = useRef<NodeJS.Timeout>();
  const isTypingRef = useRef(false);

  // Send heartbeat periodically
  useEffect(() => {
    if (!roomId) return;

    // Send initial heartbeat
    updatePresence({ roomId, data: { status: "active" } });

    // Set up periodic heartbeat
    intervalRef.current = setInterval(() => {
      updatePresence({ 
        roomId, 
        data: { 
          status: isTypingRef.current ? "typing" : "active" 
        } 
      });
    }, HEARTBEAT_INTERVAL);

    // Cleanup on unmount or room change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      leaveRoom({ roomId });
    };
  }, [roomId, updatePresence, leaveRoom]);

  // Function to update typing status
  const setTyping = useCallback((typing: boolean) => {
    isTypingRef.current = typing;
    if (roomId) {
      updatePresence({ 
        roomId, 
        data: { status: typing ? "typing" : "active" } 
      });
    }
  }, [roomId, updatePresence]);

  return {
    presentUsers: presentUsers || [],
    setTyping,
  };
}
```

### React Component Example

Create `web/src/components/rooms/RoomPresence.tsx`:

```typescript
import { useRoomPresence } from "@/hooks/useRoomPresence";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Id } from "@/convex/_generated/dataModel";

interface RoomPresenceProps {
  roomId: Id<"rooms">;
}

export function RoomPresence({ roomId }: RoomPresenceProps) {
  const { presentUsers } = useRoomPresence(roomId);

  if (presentUsers.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">
        {presentUsers.length} {presentUsers.length === 1 ? "person" : "people"} online
      </span>
      <div className="flex -space-x-2">
        <TooltipProvider>
          {presentUsers.slice(0, 5).map((user) => (
            <Tooltip key={user.userId}>
              <TooltipTrigger>
                <Avatar className="h-8 w-8 border-2 border-background">
                  <AvatarImage src={user.userAvatar} />
                  <AvatarFallback>
                    {user.userName?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p>{user.userName}</p>
                {user.data?.status === "typing" && (
                  <p className="text-xs text-muted-foreground">typing...</p>
                )}
              </TooltipContent>
            </Tooltip>
          ))}
          {presentUsers.length > 5 && (
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs">
              +{presentUsers.length - 5}
            </div>
          )}
        </TooltipProvider>
      </div>
    </div>
  );
}
```

### Typing Indicator Component

Create `web/src/components/rooms/TypingIndicator.tsx`:

```typescript
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface TypingIndicatorProps {
  roomId: Id<"rooms">;
  currentUserId: Id<"users">;
}

export function TypingIndicator({ roomId, currentUserId }: TypingIndicatorProps) {
  const presentUsers = useQuery(api.presence.listPresence, { roomId });

  const typingUsers = presentUsers?.filter(
    (user) => user.userId !== currentUserId && user.data?.status === "typing"
  );

  if (!typingUsers || typingUsers.length === 0) {
    return null;
  }

  const names = typingUsers.map((u) => u.userName).join(", ");

  return (
    <div className="px-4 py-2 text-sm text-muted-foreground">
      <span className="inline-flex items-center gap-1">
        {names} {typingUsers.length === 1 ? "is" : "are"} typing
        <span className="animate-pulse">...</span>
      </span>
    </div>
  );
}
```

---

## Configuration

### Environment Variables
None required - Presence component works out of the box.

### Optional Configuration

In `web/convex/presence.ts`, you can customize:

```typescript
export const presence = new Presence(components.presence, {
  // Time before a user is considered offline (ms)
  expiresIn: 45000, // Default: 60000 (60 seconds)
});
```

### Heartbeat Interval
Adjust in the frontend hook (`web/src/hooks/useRoomPresence.ts`):

```typescript
const HEARTBEAT_INTERVAL = 30000; // Recommend: 30-45 seconds
```

**Important**: Heartbeat interval should be less than `expiresIn` to prevent flickering online/offline status.

---

## Best Practices

### 1. Authentication Integration
Always verify the user is authenticated and has permission to view presence:

```typescript
await getAuthenticatedUser(ctx);
await requireRoomParticipant(ctx, args.roomId, userProfile._id);
```

### 2. Efficient Queries
The component's `list()` query is already optimized. Use it directly without caching:

```typescript
// ✅ GOOD: Direct binding
export const listPresence = query({
  handler: async (ctx, args) => {
    return await presence.list(ctx, args.roomId);
  },
});

// ❌ BAD: Unnecessary caching layer
const cache = new Map();
// Don't do this - Convex queries are already reactive
```

### 3. Cleanup on Unmount
Always disconnect users when they leave:

```typescript
useEffect(() => {
  return () => {
    leaveRoom({ roomId });
  };
}, [roomId, leaveRoom]);
```

### 4. Heartbeat Timing
- Keep heartbeat interval under 45 seconds
- Set `expiresIn` slightly higher than heartbeat interval
- Add jitter to prevent thundering herd if many users are online

### 5. Performance
- Limit avatar display to first 5-10 users with "+X more" indicator
- Use tooltip to show full list on hover
- Consider debouncing typing status updates

### 6. Visual Feedback
- Use green dot/badge for online status
- Show "last seen" timestamps for offline users
- Add smooth transitions for presence changes

---

## Migration Plan

### Phase 1: Backend Setup (Week 1)
1. Install package and configure
2. Create `convex/presence.ts` with mutations and queries
3. Add authentication checks
4. Test with Convex dashboard

### Phase 2: Frontend Hook (Week 1)
1. Create `useRoomPresence` hook
2. Implement heartbeat mechanism
3. Add cleanup logic
4. Test in development

### Phase 3: UI Components (Week 2)
1. Create `RoomPresence` component (avatar list)
2. Create `TypingIndicator` component
3. Add to room chat interface
4. Style with existing design system

### Phase 4: Integration (Week 2)
1. Add presence to room sidebar
2. Add to event dashboard
3. Add presence badges to room list
4. Test with multiple users

### Phase 5: Polish (Week 3)
1. Add animations and transitions
2. Optimize performance
3. Add error handling
4. User acceptance testing

---

## Testing Strategy

### Unit Tests
```typescript
// Test presence heartbeat
test("updatePresence requires room participant", async () => {
  // Test that non-participants cannot update presence
});

test("listPresence returns only current users", async () => {
  // Test presence list accuracy
});
```

### Integration Tests
1. **Multi-user test**: Open app in multiple browsers, verify presence shows correctly
2. **Disconnect test**: Close tab, verify user disappears after timeout
3. **Room switching**: Switch between rooms, verify presence updates
4. **Typing indicator**: Type in one browser, verify indicator shows in another

### Manual Testing Checklist
- [ ] Presence appears when user joins room
- [ ] Presence updates periodically (heartbeat)
- [ ] Presence disappears when user leaves
- [ ] Typing indicator shows when typing
- [ ] Avatar tooltips show user names
- [ ] "+X more" indicator works with many users
- [ ] No memory leaks on room switching
- [ ] Works across multiple tabs/devices

### Performance Testing
- Test with 10+ simultaneous users in a room
- Monitor database read/write load
- Check for heartbeat request throttling
- Verify no UI lag from presence updates

---

## Security Considerations

### 1. Room Access Control
Only allow presence updates/queries for room participants:

```typescript
await requireRoomParticipant(ctx, args.roomId, userProfile._id);
```

### 2. Data Privacy
Don't expose sensitive user information in presence data:

```typescript
// ✅ GOOD: Public profile info only
await presence.heartbeat(ctx, roomId, {
  userId: userProfile._id,
  userName: userProfile.name,
  userAvatar: userProfile.avatar,
});

// ❌ BAD: Don't include private data
await presence.heartbeat(ctx, roomId, {
  email: userProfile.email, // Don't expose
  phone: userProfile.phone, // Don't expose
});
```

### 3. Rate Limiting
Consider rate limiting heartbeat updates to prevent abuse:

```typescript
// Use rate limiter component (see rate-limiter.md)
await rateLimiter.limit(ctx, "presenceHeartbeat", {
  key: userProfile._id,
  count: 1,
});
```

### 4. Vendor Isolation
Ensure vendors only see presence in their assigned rooms:

```typescript
// Check vendor permissions
const room = await ctx.db.get(args.roomId);
if (room.type === "vendor" && room.vendorId !== userProfile._id) {
  throw new Error("Not authorized for this vendor room");
}
```

---

## Common Issues & Troubleshooting

### Issue: Users appear offline despite being active
**Solution**: Check heartbeat interval vs expiry time. Heartbeat should be < expiresIn.

### Issue: Presence flickers on/off
**Solution**: Network latency causing delayed heartbeats. Increase `expiresIn` or decrease heartbeat interval.

### Issue: Memory leak when switching rooms
**Solution**: Ensure cleanup function in `useEffect` properly clears intervals and calls `leaveRoom`.

### Issue: Too many database writes
**Solution**: Increase heartbeat interval to 45-60 seconds. Consider sharding if many concurrent users.

### Issue: Typing indicator delays
**Solution**: Send typing status immediately on keypress, not only on heartbeat interval.

---

## Future Enhancements

1. **Rich Status Messages**
   - "Away", "Do Not Disturb", "In a meeting"
   - Custom status messages

2. **Activity Tracking**
   - Track which page/section users are viewing
   - Show "viewing tasks", "viewing budget", etc.

3. **Presence History**
   - Store presence data for analytics
   - Show "active users in last 24h" metrics

4. **Notifications**
   - Notify when specific users come online
   - Alert coordinators when vendors become available

5. **Integration with BetterAuth**
   - Sync presence with auth session
   - Auto-disconnect on logout

---

## References

- [Presence Component Docs](https://www.convex.dev/components/presence)
- [Convex Components Reference](../../../llm_docs/convex_components_reference.md)
- [Using ctx.runQuery/ctx.runMutation](https://docs.convex.dev/components)
