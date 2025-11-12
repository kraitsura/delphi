/**
 * Migration: Add username field to existing users
 *
 * Run this migration once to add username to all existing users.
 * Username is generated from name: "Aarya Reddy" -> "aaryareddy"
 * If duplicate, appends numbers: "aaryareddy1", "aaryareddy2", etc.
 *
 * Usage:
 * 1. Deploy this file
 * 2. Run: npx convex run migrations/addUsername:migrateUsers
 * 3. Check migration status: npx convex run migrations/addUsername:getMigrationStatus
 */

import { internalMutation, internalQuery } from "../_generated/server";

/**
 * Generate username from name
 */
function generateBaseUsername(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim() || "user";
}

/**
 * Migrate all users without username
 */
export const migrateUsers = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("Starting username migration...");

    // Get all users
    const allUsers = await ctx.db.query("users").collect();

    // Track used usernames to handle duplicates
    const usedUsernames = new Set<string>();

    // First pass: collect existing usernames
    for (const user of allUsers) {
      if ((user as any).username) {
        usedUsernames.add((user as any).username);
      }
    }

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Second pass: add username to users without one
    for (const user of allUsers) {
      try {
        // Skip if user already has username
        if ((user as any).username) {
          console.log(`User ${user.email} already has username: ${(user as any).username}`);
          skippedCount++;
          continue;
        }

        // Generate base username from name
        const baseUsername = generateBaseUsername(user.name);

        // Find available username
        let username = baseUsername;
        let counter = 1;

        while (usedUsernames.has(username)) {
          username = `${baseUsername}${counter}`;
          counter++;
        }

        // Mark username as used
        usedUsernames.add(username);

        // Update user with username
        await ctx.db.patch(user._id, {
          username,
          updatedAt: Date.now(),
        });

        console.log(`✓ Migrated ${user.email} → @${username}`);
        migratedCount++;

      } catch (error) {
        console.error(`✗ Error migrating user ${user.email}:`, error);
        errorCount++;
      }
    }

    const summary = {
      total: allUsers.length,
      migrated: migratedCount,
      skipped: skippedCount,
      errors: errorCount,
      completedAt: new Date().toISOString(),
    };

    console.log("\n=== Migration Summary ===");
    console.log(`Total users: ${summary.total}`);
    console.log(`Migrated: ${summary.migrated}`);
    console.log(`Skipped (already had username): ${summary.skipped}`);
    console.log(`Errors: ${summary.errors}`);
    console.log("========================\n");

    return summary;
  },
});

/**
 * Get migration status - check how many users need migration
 */
export const getMigrationStatus = internalQuery({
  args: {},
  handler: async (ctx) => {
    const allUsers = await ctx.db.query("users").collect();

    const withUsername = allUsers.filter(u => (u as any).username);
    const withoutUsername = allUsers.filter(u => !(u as any).username);

    return {
      total: allUsers.length,
      withUsername: withUsername.length,
      withoutUsername: withoutUsername.length,
      needsMigration: withoutUsername.length > 0,
      usersNeedingMigration: withoutUsername.map(u => ({
        id: u._id,
        name: u.name,
        email: u.email,
      })),
    };
  },
});

/**
 * Check for duplicate usernames (validation)
 */
export const checkDuplicateUsernames = internalQuery({
  args: {},
  handler: async (ctx) => {
    const allUsers = await ctx.db.query("users").collect();

    const usernameCounts = new Map<string, number>();

    for (const user of allUsers) {
      const username = (user as any).username;
      if (username) {
        usernameCounts.set(username, (usernameCounts.get(username) || 0) + 1);
      }
    }

    const duplicates = Array.from(usernameCounts.entries())
      .filter(([_, count]) => count > 1)
      .map(([username, count]) => ({ username, count }));

    return {
      hasDuplicates: duplicates.length > 0,
      duplicates,
    };
  },
});
