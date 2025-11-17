import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// HELPER FUNCTIONS

export async function createCheckpoint(
  ctx: MutationCtx,
  args: {
    roomId: Id<"rooms">;
    doInstanceId: string;
    snapshot: string;
    messageCount: number;
    memorySize: number;
    checksum?: string;
  }
): Promise<Id<"checkpoints">> {
  const now = Date.now();

  // Get the next checkpoint ID for this room
  const existingCheckpoints = await ctx.db
    .query("checkpoints")
    .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
    .collect();

  const maxCheckpointId = Math.max(
    ...existingCheckpoints.map((c) => c.checkpointId),
    -1
  );

  const checkpointId = await ctx.db.insert("checkpoints", {
    ...args,
    checkpointId: maxCheckpointId + 1,
    createdAt: now,
  });

  return checkpointId;
}

export async function getCheckpoint(
  ctx: QueryCtx,
  args: { checkpointId: Id<"checkpoints"> }
) {
  return await ctx.db.get(args.checkpointId);
}

export async function getLatestCheckpoint(
  ctx: QueryCtx,
  args: { roomId: Id<"rooms"> }
) {
  const checkpoints = await ctx.db
    .query("checkpoints")
    .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
    .order("desc")
    .take(1);

  return checkpoints[0] || null;
}

export async function listCheckpointsByRoom(
  ctx: QueryCtx,
  args: {
    roomId: Id<"rooms">;
    limit?: number;
  }
) {
  return await ctx.db
    .query("checkpoints")
    .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
    .order("desc")
    .take(args.limit || 10);
}

export async function listCheckpointsByDO(
  ctx: QueryCtx,
  args: {
    doInstanceId: string;
    limit?: number;
  }
) {
  return await ctx.db
    .query("checkpoints")
    .withIndex("by_do", (q) => q.eq("doInstanceId", args.doInstanceId))
    .order("desc")
    .take(args.limit || 10);
}

// API EXPORTS

// CREATE
export const create = mutation({
  args: {
    roomId: v.id("rooms"),
    doInstanceId: v.string(),
    snapshot: v.string(),
    messageCount: v.number(),
    memorySize: v.number(),
    checksum: v.optional(v.string()),
  },
  handler: async (ctx, args) => createCheckpoint(ctx, args),
});

// GET
export const get = query({
  args: { checkpointId: v.id("checkpoints") },
  handler: async (ctx, args) => getCheckpoint(ctx, args),
});

// GET LATEST by room
export const getLatest = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => getLatestCheckpoint(ctx, args),
});

// LIST BY ROOM
export const listByRoom = query({
  args: {
    roomId: v.id("rooms"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => listCheckpointsByRoom(ctx, args),
});

// LIST BY DURABLE OBJECT
export const listByDO = query({
  args: {
    doInstanceId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => listCheckpointsByDO(ctx, args),
});

// Helper: Generate checksum for snapshot validation
export const generateChecksum = (snapshot: string): string => {
  // Simple checksum using hash
  let hash = 0;
  for (let i = 0; i < snapshot.length; i++) {
    const char = snapshot.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
};

// Helper: Compress snapshot (simple implementation)
export const compressSnapshot = (data: any): string => {
  // In production, you'd want to use a proper compression library
  // For now, just stringify
  return JSON.stringify(data);
};

// Helper: Decompress snapshot
export const decompressSnapshot = (snapshot: string): any => {
  try {
    return JSON.parse(snapshot);
  } catch (error) {
    throw new Error("Failed to decompress snapshot");
  }
};
