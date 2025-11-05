# Convex Setup Audit & Normalization Guide

> **Version:** 1.0
> **Purpose:** Formal documentation for auditing, scrutinizing, and normalizing Convex database implementations
> **Audience:** Development teams, technical leads, and code reviewers

---

## Table of Contents

1. [Overview & Purpose](#overview--purpose)
2. [Core Principles & Philosophy](#core-principles--philosophy)
3. [TypeScript Configuration Standards](#typescript-configuration-standards)
4. [Schema Design Standards](#schema-design-standards)
5. [Database Operation Patterns](#database-operation-patterns)
6. [Index Design Guidelines](#index-design-guidelines)
7. [Function Architecture Standards](#function-architecture-standards)
8. [Security & Validation Standards](#security--validation-standards)
9. [Performance Optimization Patterns](#performance-optimization-patterns)
10. [Data Types & Constraints](#data-types--constraints)
11. [Code Organization Standards](#code-organization-standards)
12. [Comprehensive Audit Checklist](#comprehensive-audit-checklist)
13. [Normalization Process](#normalization-process)
14. [Anti-Pattern Detection Guide](#anti-pattern-detection-guide)

---

## Overview & Purpose

### Document Purpose

This guide provides a comprehensive framework for:
- **Auditing** existing Convex implementations for compliance with best practices
- **Normalizing** codebases to follow recommended patterns
- **Preventing** common pitfalls and anti-patterns
- **Ensuring** security, performance, and scalability

### When to Use This Guide

- Setting up new Convex projects
- Code review for Convex implementations
- Debugging performance issues
- Security audits
- Team onboarding and training
- Migration from other backends

### Audit Severity Levels

- 🔴 **CRITICAL**: Security vulnerabilities or data integrity risks
- 🟠 **HIGH**: Performance issues or scalability problems
- 🟡 **MEDIUM**: Code quality or maintainability concerns
- 🟢 **LOW**: Style preferences or optimization opportunities

---

## Core Principles & Philosophy

### The Zen of Convex

Convex is designed as an opinionated framework—a "pit of success" where architectural decisions guide developers toward reliable, performant applications.

#### Foundational Principles

1. **Center on the Sync Engine**
   - The deterministic, reactive database is Convex's foundation
   - Organize applications around this core capability
   - Leverage built-in consistency rather than building custom caching

2. **Simplify Client-State Management**
   - Use Convex's automatic caching and reactivity
   - Avoid duplicating state management on the client
   - Trust the framework's subscription system

3. **Build Frameworks Through Code**
   - Solve composition problems using standard TypeScript patterns
   - Extract reusable helper functions
   - Create domain-specific abstractions

4. **Performance Guidelines**
   - Keep queries and mutations focused (< 100ms)
   - Process fewer than several hundred records per function
   - Use actions sparingly for batch work and external integrations
   - Bind components directly to functions when possible

5. **Workflow Pattern**
   - Follow: action → mutation → action → mutation
   - Use mutations to capture intent in database
   - Use actions for external API calls
   - Schedule actions from mutations

---

## TypeScript Configuration Standards

### 🔴 CRITICAL: Required Configuration

#### Minimum Requirements

```json
// package.json or tsconfig.json requirements
{
  "typescript": ">=5.0.3"
}
```

**Severity**: 🔴 CRITICAL
**Rationale**: TypeScript < 5.0.3 lacks features required for Convex type generation

#### File Extension Requirement

- ✅ **REQUIRED**: Use `.ts` extension for all Convex functions
- ❌ **PROHIBITED**: Using `.js` files in convex/ directory

**Severity**: 🔴 CRITICAL
**Rationale**: Type inference and validation depend on TypeScript compilation

### 🟠 HIGH: Type Safety Standards

#### Import Required Generated Types

```typescript
// ✅ CORRECT: Import from generated files
import { Doc, Id } from "./_generated/dataModel"
import { QueryCtx, MutationCtx, ActionCtx } from "./_generated/server"
import { api, internal } from "./_generated/api"

// ❌ WRONG: Never manually create these types
type CustomDoc = { _id: string, name: string }  // Don't do this!
```

**Severity**: 🟠 HIGH
**Rationale**: Generated types ensure end-to-end type safety and catch errors at compile time

#### Essential Type Utilities

| Utility | Purpose | Example |
|---------|---------|---------|
| `Doc<"tableName">` | Typed documents with system fields | `Doc<"users">` |
| `Id<"tableName">` | Typed document IDs | `Id<"users">` |
| `WithoutSystemFields<Doc<"table">>` | For inserts | `WithoutSystemFields<Doc<"posts">>` |
| `Infer<typeof validator>` | Extract types from validators | `Infer<typeof v.object({...})>` |
| `FunctionReturnType<typeof api.func>` | Client-side function return types | `FunctionReturnType<typeof api.users.get>` |

### 🟡 MEDIUM: Code Quality Standards

#### ESLint Configuration

```json
// .eslintrc.json
{
  "rules": {
    "@typescript-eslint/no-floating-promises": "error"
  }
}
```

**Severity**: 🟡 MEDIUM
**Rationale**: Prevents silent failures from unawaited promises

#### Validator-Driven Type Inference

```typescript
// ✅ CORRECT: Let validators drive types
export const createUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    age: v.number(),
  },
  handler: async (ctx, args) => {
    // TypeScript automatically knows:
    // args.name: string
    // args.email: string
    // args.age: number
  }
})

// ❌ WRONG: Manual type annotations when validators exist
export const createUser = mutation({
  args: { ... },
  handler: async (ctx, args: { name: string }) => {  // Redundant!
    // ...
  }
})
```

#### Schema-Driven Type Safety

```typescript
// convex/schema.ts
export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
  })
})

// Automatically provides:
// - Doc<"users"> with typed fields
// - Id<"users"> for references
// - Typed database methods
// - Client-side hook types
```

---

## Schema Design Standards

### 🔴 CRITICAL: Schema Structure

#### Required Schema File

**Location**: `convex/schema.ts`

```typescript
import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("user"),
      v.literal("guest")
    ),
  })
    .index("by_email", ["email"])
})
```

**Severity**: 🔴 CRITICAL
**Rationale**: Schema provides runtime validation and type safety

#### System Fields (Automatic)

Every document automatically includes:
- `_id`: `Id<"tableName">` - Globally unique identifier
- `_creationTime`: `number` - Creation timestamp (milliseconds since Unix epoch)

**Do NOT include these in schema definitions**

### Progressive Formalization Approach

#### Development Phases

1. **Phase 1: Prototyping** (No schema)
   - Rapid iteration
   - Implicit typing
   - Inferred schema visible in dashboard

2. **Phase 2: Stabilization** (Partial schema)
   - Define core tables
   - Add critical validators
   - Implement essential indexes

3. **Phase 3: Production** (Complete schema)
   - All tables defined
   - All fields validated
   - All indexes optimized
   - Schema validation enabled (default)

#### When to Implement Explicit Schemas

✅ Implement when:
- Runtime validation of incoming documents needed
- Type generation for client code required
- Production readiness achieved
- Team collaboration requires consistent structure

### 🟠 HIGH: Validator Patterns

#### Basic Validators

```typescript
// Primitive types
v.null()           // null values
v.int64()          // bigint (large integers)
v.number()         // Float64 (standard numbers)
v.boolean()        // boolean
v.string()         // string
v.bytes()          // ArrayBuffer
v.id("tableName")  // Document ID reference

// Advanced types
v.optional(v.string())              // Optional field
v.union(v.string(), v.number())     // Multiple types
v.literal("active")                 // Constant value
v.array(v.string())                 // Typed array
v.object({ key: v.string() })       // Typed object
v.record(v.string(), v.number())    // Dynamic key-value
v.any()                             // Unrestricted (use sparingly)
```

#### Complex Validator Patterns

```typescript
// Enum-like unions
status: v.union(
  v.literal("pending"),
  v.literal("active"),
  v.literal("completed"),
  v.literal("archived")
)

// Nested objects
address: v.object({
  street: v.string(),
  city: v.string(),
  zipCode: v.string(),
  country: v.string(),
})

// Optional nested fields
metadata: v.optional(v.object({
  tags: v.array(v.string()),
  priority: v.number(),
}))

// Dynamic records
preferences: v.record(v.string(), v.any())
```

### 🟡 MEDIUM: Schema Validation Configuration

#### Default Behavior (Recommended)

```typescript
export default defineSchema({
  // tables...
})
// Schema validation ENABLED by default
```

**Validation Rules**:
- All existing documents validated during deployment
- Deployment rejected if violations exist
- All `insert`, `replace`, `patch` operations validated
- Strict enforcement prevents data inconsistency

#### Disabling Validation (Not Recommended)

```typescript
export default defineSchema({
  // tables...
}, { schemaValidation: false })
```

⚠️ **WARNING**: Only disable for:
- Gradual migration of legacy data
- Temporary flexibility during major refactors
- Re-enable as soon as possible

### Circular Reference Handling

#### Problem: Direct Circular References

```typescript
// ❌ VALIDATION ERROR: Circular dependency
users: defineTable({
  name: v.string(),
  managerId: v.id("users"),  // References same table
})

managers: defineTable({
  userId: v.id("users"),
  teamId: v.id("teams"),
})

teams: defineTable({
  managerId: v.id("managers"),  // Circular!
})
```

#### Solution: Optional References

```typescript
// ✅ CORRECT: Break cycle with optional
users: defineTable({
  name: v.string(),
  managerId: v.optional(v.id("users")),  // Nullable reference
})

// Creation pattern:
// 1. Create user without manager
// 2. Update with manager reference
```

---

## Database Operation Patterns

### Core Concepts

#### Document Structure
- Documents resemble JavaScript objects
- Support nested arrays and objects
- Support references to other documents (relational modeling)
- Tables created dynamically on first insert

### 🔴 CRITICAL: Reading Data

#### Single Document Retrieval

```typescript
// ✅ CORRECT: Always validate ID parameters
export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId)
    if (!user) {
      throw new Error("User not found")
    }
    return user
  }
})

// ❌ WRONG: No validation
export const getUser = query({
  handler: async (ctx, args: any) => {
    return await ctx.db.get(args.userId)  // Unsafe!
  }
})
```

**Severity**: 🔴 CRITICAL
**Rationale**: Unvalidated IDs are security vulnerabilities

#### Query Builder Pattern

```typescript
// Complete query chain
const results = await ctx.db
  .query("tableName")                    // Start query
  .withIndex("indexName", (q) =>         // Use index
    q.eq("field", value)                 // Equality filter
  )
  .order("desc")                         // Sort order
  .take(10)                              // Limit results
```

#### Result Collection Methods

| Method | Use Case | Severity if Misused |
|--------|----------|---------------------|
| `.collect()` | Small, bounded sets (< 1000 docs) | 🔴 CRITICAL |
| `.take(n)` | First n results | 🟢 LOW |
| `.first()` | Single result or null | 🟢 LOW |
| `.unique()` | Exactly one result (throws if multiple) | 🟢 LOW |
| `.paginate(opts)` | Large datasets | 🟠 HIGH if not used |

#### 🔴 CRITICAL Anti-Pattern: Unbounded Collect

```typescript
// ❌ CRITICAL: Could load millions of documents
const allUsers = await ctx.db.query("users").collect()

// ✅ CORRECT: Use pagination
const usersPage = await ctx.db
  .query("users")
  .paginate(args.paginationOpts)

// ✅ CORRECT: Use limits
const recentUsers = await ctx.db
  .query("users")
  .withIndex("by_creation_time")
  .order("desc")
  .take(50)
```

**Severity**: 🔴 CRITICAL
**Rationale**: Can cause function timeouts and memory issues

### 🟠 HIGH: Filtering Strategy Hierarchy

#### Performance Hierarchy (Best to Worst)

1. **🟢 BEST: Indexed conditions**
```typescript
await ctx.db
  .query("posts")
  .withIndex("by_author", (q) => q.eq("authorId", userId))
  .collect()
```

2. **🟡 ACCEPTABLE: TypeScript filters on small sets**
```typescript
const posts = await ctx.db
  .query("posts")
  .withIndex("by_author", (q) => q.eq("authorId", userId))
  .collect()

// Filter in memory (OK if < 1000 results)
return posts.filter(p => p.isPublished)
```

3. **🔴 AVOID: .filter() on large datasets**
```typescript
// ❌ BAD: Scans entire table
const posts = await ctx.db
  .query("posts")
  .filter(q => q.eq(q.field("isPublished"), true))
  .collect()
```

**Severity**: 🟠 HIGH
**Rationale**: Significant performance degradation

### Writing Data Patterns

#### Insert Operations

```typescript
// ✅ CORRECT: Validated insert
export const createPost = mutation({
  args: {
    title: v.string(),
    body: v.string(),
    authorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const postId = await ctx.db.insert("posts", {
      title: args.title,
      body: args.body,
      authorId: args.authorId,
      isPublished: false,
      viewCount: 0,
    })
    return postId  // Returns Id<"posts">
  }
})
```

#### Update Operations

```typescript
// Partial update (shallow merge)
await ctx.db.patch(postId, {
  title: "New Title",
  viewCount: 100,
  // Other fields unchanged
})

// Complete replacement
await ctx.db.replace(postId, {
  title: "New Title",
  body: "New Body",
  authorId: userId,
  isPublished: true,
  viewCount: 0,
  // All fields must be specified
})

// Remove field
await ctx.db.patch(postId, {
  metadata: undefined,  // Removes the field
})
```

#### Delete Operations

```typescript
// Simple delete
await ctx.db.delete(postId)

// Cascade delete pattern
export const deleteUserAndPosts = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Delete related documents
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_author", (q) => q.eq("authorId", args.userId))
      .collect()

    for (const post of posts) {
      await ctx.db.delete(post._id)
    }

    // Delete user
    await ctx.db.delete(args.userId)
  }
})
```

### 🟡 MEDIUM: Complex Query Patterns

#### Manual Joins

```typescript
export const getPostsWithAuthors = query({
  handler: async (ctx) => {
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_creation_time")
      .order("desc")
      .take(20)

    // Manual join
    const postsWithAuthors = await Promise.all(
      posts.map(async (post) => ({
        ...post,
        author: await ctx.db.get(post.authorId)
      }))
    )

    return postsWithAuthors
  }
})
```

#### Aggregations

```typescript
export const getTotalRevenue = query({
  handler: async (ctx) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "completed"))
      .collect()

    return orders.reduce((sum, order) => sum + order.amount, 0)
  }
})

// ⚠️ For high-throughput: Consider Sharded Counter pattern
```

#### Group By

```typescript
export const getOrdersByStatus = query({
  handler: async (ctx) => {
    const orders = await ctx.db.query("orders").collect()

    const grouped = orders.reduce((acc, order) => {
      const status = order.status
      if (!acc[status]) {
        acc[status] = []
      }
      acc[status].push(order)
      return acc
    }, {} as Record<string, typeof orders>)

    return grouped
  }
})
```

### Transactional Guarantees

#### Mutation Transaction Properties

1. **Consistency**: All reads see consistent snapshot
2. **Atomicity**: All writes commit together or none commit
3. **Isolation**: No concurrent interference
4. **Rollback**: Error causes full rollback

```typescript
// ✅ CORRECT: Single atomic transaction
export const transferFunds = mutation({
  args: {
    fromAccount: v.id("accounts"),
    toAccount: v.id("accounts"),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const from = await ctx.db.get(args.fromAccount)
    const to = await ctx.db.get(args.toAccount)

    if (!from || !to) throw new Error("Account not found")
    if (from.balance < args.amount) throw new Error("Insufficient funds")

    // Both updates happen atomically
    await ctx.db.patch(args.fromAccount, {
      balance: from.balance - args.amount
    })
    await ctx.db.patch(args.toAccount, {
      balance: to.balance + args.amount
    })

    // If any error occurs, both patches are rolled back
  }
})
```

---

## Index Design Guidelines

### 🔴 CRITICAL: Index Requirements

#### Basic Index Definition

```typescript
export default defineSchema({
  posts: defineTable({
    title: v.string(),
    authorId: v.id("users"),
    status: v.string(),
    publishedAt: v.number(),
  })
    // Simple index
    .index("by_author", ["authorId"])

    // Compound index
    .index("by_author_status", ["authorId", "status"])

    // Nested field index
    .index("by_metadata", ["metadata.category"])

    // Time-based index
    .index("by_published", ["publishedAt"])
})
```

**Severity**: 🔴 CRITICAL for filtered queries
**Rationale**: Queries without indexes cause full table scans

#### Automatic Indexes

Every table automatically has:
- `by_id`: For `db.get(id)` operations
- `by_creation_time`: For time-ordered queries

### 🟠 HIGH: Compound Index Design

#### Flexibility Pattern

```typescript
// Compound index supports multiple query patterns
.index("by_status_priority", ["status", "priority"])

// ✅ Supported queries:
// 1. Filter by status only
await ctx.db
  .query("tasks")
  .withIndex("by_status_priority", (q) => q.eq("status", "active"))
  .collect()

// 2. Filter by status AND priority
await ctx.db
  .query("tasks")
  .withIndex("by_status_priority", (q) =>
    q.eq("status", "active").eq("priority", "high")
  )
  .collect()

// ❌ NOT supported: Filter by priority only
// Would require separate index: ["priority"]
```

#### 🔴 CRITICAL Anti-Pattern: Index Redundancy

```typescript
// ❌ WRONG: Redundant indexes
export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    department: v.string(),
  })
    .index("by_name", ["name"])              // Redundant!
    .index("by_name_dept", ["name", "department"])  // Covers both
})

// ✅ CORRECT: Remove redundant index
export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    department: v.string(),
  })
    .index("by_name_dept", ["name", "department"])  // Covers name queries too
})
```

**Severity**: 🔴 CRITICAL
**Rationale**:
- Wastes storage
- Slows down writes
- Increases deployment time
- Complicates maintenance

### Range Expression Rules

#### Strict Field Order

```typescript
// Index definition
.index("by_status_priority_created", ["status", "priority", "createdAt"])

// ✅ CORRECT: Fields in index order
await ctx.db
  .query("tasks")
  .withIndex("by_status_priority_created", (q) =>
    q.eq("status", "active")           // 1. Equality
     .gt("priority", 5)                 // 2. Lower bound
     .lt("priority", 10)                // 3. Upper bound
  )
  .collect()

// ❌ WRONG: Fields out of order
await ctx.db
  .query("tasks")
  .withIndex("by_status_priority_created", (q) =>
    q.gt("priority", 5)                 // Wrong order!
     .eq("status", "active")
  )
  .collect()
```

#### Range Expression Order (STRICT)

1. **First**: All equality conditions (`.eq`)
2. **Second**: Single lower bound (`.gt` or `.gte`)
3. **Third**: Upper bound (`.lt` or `.lte`)
4. **Must**: Follow index field order

### 🟡 MEDIUM: Staged Indexes

#### Large Table Index Creation

```typescript
export default defineSchema({
  messages: defineTable({
    channelId: v.id("channels"),
    text: v.string(),
  })
    .index("by_channel", {
      fields: ["channelId"],
      staged: true  // Don't block deployment
    })
})
```

**Staged Index Workflow**:
1. Deploy with `staged: true`
2. Index backfills in background
3. Monitor progress in dashboard
4. Remove `staged: true` when complete
5. Redeploy to enable queries

**Use When**:
- Table has > 100,000 documents
- Deployment time is critical
- Background processing is acceptable

### Technical Limits

| Limit | Value | Severity if Exceeded |
|-------|-------|---------------------|
| Fields per index | 16 | 🔴 CRITICAL |
| Indexes per table | 32 | 🔴 CRITICAL |
| Duplicate fields | 0 (prohibited) | 🔴 CRITICAL |
| Reserved fields (_prefix) | 0 (prohibited) | 🔴 CRITICAL |

### Index Performance Considerations

#### Index Selection Impact

- **With Index**: O(log n + results) complexity
- **Without Index**: O(table size) complexity

#### Write Performance Impact

Each write operation (insert/update/delete):
- Must update ALL index entries
- Scales with number of indexes
- Why Convex limits to 32 indexes per table

#### Deployment Performance

Initial index creation:
- Must process all existing documents
- Larger tables take longer
- Use staged indexes for large tables
- Monitor dashboard for progress

---

## Function Architecture Standards

### 🔴 CRITICAL: Function Type Decision Matrix

| Capability | Queries | Mutations | Actions |
|-----------|---------|-----------|---------|
| **Database read** | ✅ | ✅ | Via `ctx.runQuery` |
| **Database write** | ❌ | ✅ | Via `ctx.runMutation` |
| **Transactional** | ✅ | ✅ | ❌ |
| **Deterministic** | REQUIRED | REQUIRED | Not required |
| **Caching** | ✅ | ❌ | ❌ |
| **Real-time updates** | ✅ | ❌ | ❌ |
| **External API calls** | ❌ | ❌ | ✅ |
| **Timeout** | Short | Short | 10 min max |
| **Use for** | Read data | Write data | External APIs |

### Query Functions

#### Structure & Purpose

```typescript
import { query } from "./_generated/server"
import { v } from "convex/values"

export const listPosts = query({
  args: {
    authorId: v.optional(v.id("users")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let postsQuery = ctx.db.query("posts")

    if (args.authorId) {
      postsQuery = postsQuery.withIndex(
        "by_author",
        (q) => q.eq("authorId", args.authorId)
      )
    }

    return await postsQuery
      .order("desc")
      .take(args.limit ?? 20)
  }
})
```

#### Context Access

```typescript
export const exampleQuery = query({
  handler: async (ctx) => {
    // ✅ Available in QueryCtx:
    ctx.db          // Database read operations
    ctx.storage     // File URL retrieval
    ctx.auth        // Authentication verification

    // ❌ NOT available:
    ctx.scheduler   // Only in mutations
    // ctx.db.insert/patch/replace/delete  // Only in mutations
  }
})
```

#### 🔴 CRITICAL: Determinism Requirement

```typescript
// ❌ WRONG: Non-deterministic
export const badQuery = query({
  handler: async (ctx) => {
    return {
      timestamp: Date.now(),        // Non-deterministic!
      random: Math.random(),        // Non-deterministic!
      data: await fetch("https://api.example.com")  // External call!
    }
  }
})

// ✅ CORRECT: Deterministic
export const goodQuery = query({
  handler: async (ctx) => {
    return await ctx.db.query("posts").collect()
    // Same input always returns same output
  }
})
```

**Severity**: 🔴 CRITICAL
**Rationale**: Non-determinism breaks caching and reactivity

### Mutation Functions

#### Structure & Purpose

```typescript
import { mutation } from "./_generated/server"
import { v } from "convex/values"

export const createPost = mutation({
  args: {
    title: v.string(),
    body: v.string(),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify authentication
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Unauthorized")
    }

    // Insert document
    const postId = await ctx.db.insert("posts", {
      title: args.title,
      body: args.body,
      tags: args.tags,
      authorId: identity.subject,
      isPublished: false,
      viewCount: 0,
    })

    // Schedule follow-up action
    await ctx.scheduler.runAfter(
      0,
      internal.notifications.notifyFollowers,
      { postId }
    )

    return postId
  }
})
```

#### Context Access

```typescript
export const exampleMutation = mutation({
  handler: async (ctx) => {
    // ✅ Available in MutationCtx:
    ctx.db          // Read/write database operations
    ctx.storage     // File upload URL generation
    ctx.auth        // User authentication checks
    ctx.scheduler   // Schedule future functions
  }
})
```

#### 🔴 CRITICAL: Transaction Guarantees

```typescript
export const updateUserProfile = mutation({
  handler: async (ctx, args) => {
    // All operations in single atomic transaction:

    // 1. Read operations see consistent snapshot
    const user = await ctx.db.get(args.userId)
    const posts = await ctx.db.query("posts")
      .withIndex("by_author", (q) => q.eq("authorId", args.userId))
      .collect()

    // 2. Write operations commit together
    await ctx.db.patch(args.userId, { name: args.newName })

    for (const post of posts) {
      await ctx.db.patch(post._id, { authorName: args.newName })
    }

    // 3. If any error occurs, NOTHING persists (full rollback)
    // 4. On client, mutations queue sequentially (no race conditions)
  }
})
```

**Severity**: 🔴 CRITICAL
**Rationale**: Transactions guarantee data consistency

### Action Functions

#### Structure & Purpose

```typescript
import { action } from "./_generated/server"
import { v } from "convex/values"
import { api, internal } from "./_generated/api"

export const processPayment = action({
  args: {
    orderId: v.id("orders"),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    // 1. Read data via query
    const order = await ctx.runQuery(
      api.orders.get,
      { orderId: args.orderId }
    )

    // 2. Call external API
    const paymentResult = await fetch("https://payment-api.example.com", {
      method: "POST",
      body: JSON.stringify({
        amount: args.amount,
        orderId: args.orderId,
      })
    })

    const data = await paymentResult.json()

    // 3. Update database via mutation
    await ctx.runMutation(
      internal.orders.updatePaymentStatus,
      {
        orderId: args.orderId,
        status: data.success ? "paid" : "failed",
        transactionId: data.transactionId,
      }
    )

    return data
  }
})
```

#### Runtime Options

**Default (Convex Runtime):**
```typescript
export const convexAction = action({
  handler: async (ctx) => {
    // - Supports fetch
    // - 64MB memory
    // - Faster execution
    // - No cold starts
  }
})
```

**Node.js Runtime:**
```typescript
"use node"  // Must be first line in file

import { action } from "./_generated/server"

export const nodeAction = action({
  handler: async (ctx) => {
    // - Full Node.js API
    // - 512MB memory
    // - Can use Node packages
    // - Slight cold start
  }
})
```

#### 🔴 CRITICAL: Action Pattern (REQUIRED)

```typescript
// ❌ ANTI-PATTERN: Direct client → action
// Risky: Network failures cause duplicate execution

// Client code (RISKY):
const action = useAction(api.payments.process)
await action({ orderId, amount })  // May execute multiple times!


// ✅ RECOMMENDED PATTERN: Mutation → scheduled action

// Step 1: Client calls mutation (captures intent)
export const initiatePayment = mutation({
  args: {
    orderId: v.id("orders"),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    // Write intent to database
    const paymentId = await ctx.db.insert("payments", {
      orderId: args.orderId,
      amount: args.amount,
      status: "pending",
    })

    // Schedule action (exactly-once execution)
    await ctx.scheduler.runAfter(
      0,
      internal.payments.processPayment,
      { paymentId }
    )

    return paymentId
  }
})

// Step 2: Action processes asynchronously
export const processPayment = internalAction({
  args: { paymentId: v.id("payments") },
  handler: async (ctx, args) => {
    // External API call
    const result = await fetch(...)

    // Update database
    await ctx.runMutation(
      internal.payments.updateStatus,
      { paymentId: args.paymentId, result }
    )
  }
})
```

**Severity**: 🔴 CRITICAL
**Rationale**: Prevents duplicate processing and data corruption

#### 🟠 HIGH: Action Best Practices

**Sequential Database Calls (INCONSISTENT)**
```typescript
// ❌ BAD: Separate transactions
export const badAction = action({
  handler: async (ctx) => {
    const user = await ctx.runQuery(api.users.get, { id: "123" })
    const posts = await ctx.runQuery(api.posts.byUser, { userId: "123" })
    // user and posts may be from different points in time!
  }
})

// ✅ GOOD: Single transaction
export const goodAction = action({
  handler: async (ctx) => {
    const data = await ctx.runQuery(api.users.getWithPosts, { id: "123" })
    // All data from consistent snapshot
  }
})
```

**Unawaited Promises (DANGEROUS)**
```typescript
// ❌ DANGEROUS: Not awaited
export const badAction = action({
  handler: async (ctx) => {
    ctx.runMutation(api.logs.write, { event: "started" })  // Dangling!
    await externalAPICall()
  }
})

// ✅ CORRECT: Awaited
export const goodAction = action({
  handler: async (ctx) => {
    await ctx.runMutation(api.logs.write, { event: "started" })
    await externalAPICall()
  }
})
```

**Helper Functions (EFFICIENT)**
```typescript
// ❌ INEFFICIENT: Action wrapping
export const helperAction = action({
  handler: async (ctx, args) => {
    return someLogic(args)
  }
})

await ctx.runAction(api.helperAction, { data })  // Unnecessary overhead!

// ✅ EFFICIENT: Plain TypeScript function
// helpers.ts
export async function helperFunction(args: any) {
  return someLogic(args)
}

// In action:
import { helperFunction } from "./helpers"
await helperFunction({ data })  // Direct call
```

---

## Security & Validation Standards

### 🔴 CRITICAL: Argument Validation

#### Security Rationale

**TypeScript types don't exist at runtime!**

```typescript
// ❌ FALSE SECURITY: TypeScript type only
export const unsafeFunction = mutation({
  handler: async (ctx, args: { userId: Id<"users"> }) => {
    // Malicious user can send ANY value!
    await ctx.db.get(args.userId)  // Could access wrong table!
  }
})

// ✅ TRUE SECURITY: Runtime validation
export const safeFunction = mutation({
  args: {
    userId: v.id("users")  // Validated at runtime!
  },
  handler: async (ctx, args) => {
    await ctx.db.get(args.userId)  // Guaranteed valid
  }
})
```

**Severity**: 🔴 CRITICAL
**Rationale**: Direct security vulnerability

#### Required Validation Patterns

```typescript
import { v } from "convex/values"

export const secureFunction = mutation({
  args: {
    // Document IDs - ALWAYS use v.id()
    userId: v.id("users"),
    postId: v.id("posts"),

    // Required fields
    title: v.string(),
    count: v.number(),
    active: v.boolean(),

    // Optional fields
    description: v.optional(v.string()),
    metadata: v.optional(v.object({
      tags: v.array(v.string()),
      priority: v.number(),
    })),

    // Enums
    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("archived")
    ),
  },
  handler: async (ctx, args) => {
    // All args validated before handler runs
  }
})
```

#### Return Value Validation

```typescript
export const getUser = query({
  args: { userId: v.id("users") },
  returns: v.object({
    _id: v.id("users"),
    _creationTime: v.number(),
    name: v.string(),
    email: v.string(),
    // Prevents accidental data leakage
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId)
    if (!user) throw new Error("User not found")

    // Return value validated before sending to client
    return user
  }
})
```

**Severity**: 🟠 HIGH
**Rationale**: Prevents accidental data exposure

#### Strict Object Validation

```typescript
// Schema definition
users: defineTable({
  name: v.string(),
  email: v.string(),
})

// ❌ VALIDATION ERROR: Extra field
await ctx.db.insert("users", {
  name: "Alice",
  email: "alice@example.com",
  ssn: "123-45-6789"  // Not in schema - REJECTED!
})

// ✅ CORRECT: Only defined fields
await ctx.db.insert("users", {
  name: "Alice",
  email: "alice@example.com"
})
```

**Severity**: 🔴 CRITICAL
**Rationale**: Stricter than TypeScript, prevents data leakage

### 🔴 CRITICAL: Access Control Patterns

#### Authentication Requirements

```typescript
export const secureFunction = mutation({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    // ✅ STEP 1: ALWAYS check authentication first
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Unauthorized")
    }

    // ✅ STEP 2: Use identity.subject for user ID
    const userId = identity.subject

    // ✅ STEP 3: Verify ownership
    const resource = await ctx.db.get(args.resourceId)
    if (resource.ownerId !== userId) {
      throw new Error("Forbidden")
    }

    // Proceed with authorized operations
  }
})
```

#### 🔴 CRITICAL Anti-Pattern: Spoofable Parameters

```typescript
// ❌ CRITICAL VULNERABILITY: Email can be spoofed
export const dangerousFunction = mutation({
  args: {
    userEmail: v.string(),  // Client can send ANY email!
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.userEmail))
      .unique()

    // Attacker can access any user's data!
    return user.secretData
  }
})

// ✅ SECURE: Use authenticated context
export const secureFunction = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Unauthorized")

    // Use server-verified identity
    const user = await ctx.db
      .query("users")
      .withIndex("by_subject", (q) => q.eq("subject", identity.subject))
      .unique()

    return user.secretData
  }
})
```

**Severity**: 🔴 CRITICAL
**Rationale**: Complete security bypass

#### Trusted Parameters

**✅ ALWAYS TRUST:**
- Convex document IDs (`v.id("tableName")`)
- UUIDs generated server-side
- `ctx.auth.getUserIdentity()` results

**❌ NEVER TRUST:**
- Email addresses
- Usernames
- Any user-supplied identifier
- Client-side claims

#### Granular Functions Pattern

```typescript
// ❌ BAD: Generic update function
export const updateTeam = mutation({
  args: {
    teamId: v.id("teams"),
    updates: v.any(),  // Too permissive!
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.teamId, args.updates)
    // User could update any field, including ownerId!
  }
})

// ✅ GOOD: Specific functions
export const setTeamName = mutation({
  args: {
    teamId: v.id("teams"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify ownership
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Unauthorized")

    const team = await ctx.db.get(args.teamId)
    if (team.ownerId !== identity.subject) {
      throw new Error("Forbidden")
    }

    // Only update specific field
    await ctx.db.patch(args.teamId, { name: args.name })
  }
})

export const setTeamOwner = mutation({
  args: {
    teamId: v.id("teams"),
    newOwnerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Different authorization logic
    // ... admin check ...
    await ctx.db.patch(args.teamId, { ownerId: args.newOwnerId })
  }
})
```

**Severity**: 🟠 HIGH
**Rationale**: Fine-grained control over permissions

### Function Visibility

#### Internal Functions

```typescript
import { internalMutation, internalQuery, internalAction } from "./_generated/server"

// ✅ Internal function - cannot be called from client
export const internalHelper = internalMutation({
  handler: async (ctx, args) => {
    // Only callable via:
    // - ctx.runMutation(internal.module.internalHelper, args)
    // - ctx.scheduler.runAfter(0, internal.module.internalHelper, args)
    // - Cron jobs
  }
})
```

#### Visibility Rules

| Function Type | Client Access | Scheduled Access |
|---------------|---------------|------------------|
| `query` | ✅ Yes | ⚠️ Avoid |
| `mutation` | ✅ Yes | ⚠️ Avoid |
| `action` | ✅ Yes | ⚠️ Avoid |
| `internalQuery` | ❌ No | ✅ Yes |
| `internalMutation` | ❌ No | ✅ Yes |
| `internalAction` | ❌ No | ✅ Yes |

#### 🟠 HIGH: Scheduled Function Security

```typescript
// ❌ BAD: Public function in cron
export const cleanup = mutation({
  handler: async (ctx) => {
    // Anyone can call this!
  }
})

// In crons.ts:
export default cronJobs.monthly(
  "cleanup",
  { day: 1 },
  api.cleanup  // Public function - security risk!
)

// ✅ GOOD: Internal function in cron
export const cleanup = internalMutation({
  handler: async (ctx) => {
    // Only callable from scheduled tasks
  }
})

// In crons.ts:
export default cronJobs.monthly(
  "cleanup",
  { day: 1 },
  internal.cleanup  // Internal function - secure!
)
```

**Severity**: 🟠 HIGH
**Rationale**: Public functions can be abused

---

## Performance Optimization Patterns

### 🔴 CRITICAL: Over-Fetching Prevention

#### Problem: Load All, Filter Later

```typescript
// ❌ CRITICAL: Loads ALL documents
export const getPublishedPosts = query({
  handler: async (ctx) => {
    const allPosts = await ctx.db.query("posts").collect()
    return allPosts.filter(p => p.isPublished)
    // Scans millions of rows, filters in memory!
  }
})

// ✅ CORRECT: Index-based filtering
export const getPublishedPosts = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("posts")
      .withIndex("by_published", (q) => q.eq("isPublished", true))
      .collect()
    // Only loads relevant documents!
  }
})
```

**Severity**: 🔴 CRITICAL
**Impact**: Function timeouts, memory exhaustion

### 🟠 HIGH: Pagination Implementation

#### When to Paginate

Paginate when:
- Result set could exceed 1000 documents
- Displaying data incrementally (infinite scroll)
- Large list displays
- Performance is critical

```typescript
import { paginationOptsValidator } from "convex/server"

export const listPosts = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("posts")
      .withIndex("by_creation_time")
      .order("desc")
      .paginate(args.paginationOpts)
  }
})

// Client usage:
const { results, status, loadMore } = usePaginatedQuery(
  api.posts.listPosts,
  {},
  { initialNumItems: 20 }
)
```

**Severity**: 🟠 HIGH
**Impact**: Poor user experience, slow queries

### 🟠 HIGH: Hot/Cold Data Splitting

#### Problem: Frequently Updated Fields

```typescript
// ❌ BAD: Frequently updated field causes query thrashing
export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    lastSeen: v.number(),  // Updated every second!
  })
})

// This query reruns EVERY SECOND even though it only needs name
export const getUserName = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId)
    return user?.name
  }
})
```

#### Solution: Separate Tables

```typescript
// ✅ GOOD: Separate hot and cold data
export default defineSchema({
  // Cold data (rarely changes)
  users: defineTable({
    name: v.string(),
    email: v.string(),
  }),

  // Hot data (frequently changes)
  userActivity: defineTable({
    userId: v.id("users"),
    lastSeen: v.number(),
    loginCount: v.number(),
  }).index("by_user", ["userId"])
})

// Query only fetches what it needs
export const getUserName = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId)
    return user?.name
    // Only triggers when name/email changes!
  }
})
```

**Severity**: 🟠 HIGH
**Impact**: Unnecessary query reruns, wasted bandwidth

### 🟡 MEDIUM: Consistent Transaction Patterns

#### Problem: Multiple Sequential Queries

```typescript
// ❌ BAD: Multiple separate transactions
export const getInconsistentData = action({
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(api.users.get, { id: "user1" })
    const posts = await ctx.runQuery(api.posts.byUser, { userId: "user1" })
    // user and posts might be from different points in time!
    return { user, posts }
  }
})
```

#### Solution: Single Query

```typescript
// ✅ GOOD: Single transaction (consistent snapshot)
export const getConsistentData = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId)
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_author", (q) => q.eq("authorId", args.userId))
      .collect()
    // All data from same consistent snapshot
    return { user, posts }
  }
})
```

**Severity**: 🟡 MEDIUM
**Impact**: Data inconsistency, race conditions

### 🟡 MEDIUM: Denormalization Patterns

#### When to Denormalize

Denormalize when:
- Data is read frequently
- Data changes rarely
- Join performance is bottleneck
- Consistency requirements are relaxed

```typescript
// Instead of always loading full user for each comment
export default defineSchema({
  comments: defineTable({
    text: v.string(),
    authorId: v.id("users"),
    // Denormalized fields (copies from users table)
    authorName: v.string(),
    authorAvatar: v.string(),
  }).index("by_post", ["postId"])
})

// No join needed - faster queries
export const getComments = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("comments")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect()
    // All data in single table!
  }
})

// Trade-off: Must update comments when user changes name
export const updateUserName = mutation({
  args: { userId: v.id("users"), newName: v.string() },
  handler: async (ctx, args) => {
    // Update user
    await ctx.db.patch(args.userId, { name: args.newName })

    // Update denormalized data in comments
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_author", (q) => q.eq("authorId", args.userId))
      .collect()

    for (const comment of comments) {
      await ctx.db.patch(comment._id, { authorName: args.newName })
    }
  }
})
```

**Severity**: 🟡 MEDIUM
**Impact**: Query performance vs update complexity

### 🟡 MEDIUM: Queue Pattern

#### High-Throughput Operations

```typescript
export default defineSchema({
  jobs: defineTable({
    type: v.string(),
    data: v.any(),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    processedAt: v.optional(v.number()),
  }).index("by_status", ["status"])
})

// Producer: Add jobs to queue
export const enqueueJob = mutation({
  args: { type: v.string(), data: v.any() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("jobs", {
      type: args.type,
      data: args.data,
      status: "pending",
    })
  }
})

// Consumer: Process next job
export const processNextJob = mutation({
  handler: async (ctx) => {
    const nextJob = await ctx.db
      .query("jobs")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .first()

    if (!nextJob) return null

    // Mark as processing
    await ctx.db.patch(nextJob._id, {
      status: "processing",
      processedAt: Date.now(),
    })

    // Schedule action to do actual work
    await ctx.scheduler.runAfter(
      0,
      internal.jobs.processJob,
      { jobId: nextJob._id }
    )

    return nextJob
  }
})
```

**Severity**: 🟡 MEDIUM
**Use Case**: High-throughput asynchronous processing

### Client-Side Optimization

#### Debounce Rapid Changes

```typescript
import { useQuery } from "convex/react"
import { useMemo, useState } from "react"
import { debounce } from "lodash"

function SearchBox() {
  const [debouncedQuery, setDebouncedQuery] = useState("")

  const debouncedSetQuery = useMemo(
    () => debounce((q: string) => setDebouncedQuery(q), 300),
    []
  )

  const results = useQuery(api.search.query, { query: debouncedQuery })

  return (
    <input
      onChange={(e) => debouncedSetQuery(e.target.value)}
      placeholder="Search..."
    />
  )
}
```

**Severity**: 🟢 LOW
**Impact**: Reduces unnecessary query load

---

## Data Types & Constraints

### Supported Types

| Type | JavaScript | Validator | Storage | Example |
|------|-----------|-----------|---------|---------|
| **Id** | string | `v.id("table")` | 32 bytes | `doc._id` |
| **Null** | null | `v.null()` | - | `null` |
| **Int64** | bigint | `v.int64()` | 8 bytes | `9007199254740991n` |
| **Float64** | number | `v.number()` | 8 bytes | `3.14159` |
| **Boolean** | boolean | `v.boolean()` | 1 byte | `true` |
| **String** | string | `v.string()` | UTF-8 | `"hello"` |
| **Bytes** | ArrayBuffer | `v.bytes()` | Raw bytes | `new ArrayBuffer(8)` |
| **Array** | Array | `v.array(type)` | Variable | `[1, 2, 3]` |
| **Object** | Object | `v.object({...})` | Variable | `{a: 1}` |
| **Record** | Record | `v.record(k, v)` | Variable | `{"key": "val"}` |

### 🔴 CRITICAL: Size Constraints

#### Value Limits

| Constraint | Limit | Severity |
|-----------|-------|----------|
| Individual value size | < 1 MB | 🔴 CRITICAL |
| String length (UTF-8) | < 1 MB | 🔴 CRITICAL |
| Bytes size | < 1 MB | 🔴 CRITICAL |
| Nesting depth | ≤ 16 levels | 🔴 CRITICAL |
| Array elements | ≤ 8,192 | 🔴 CRITICAL |
| Object entries | ≤ 1,024 | 🔴 CRITICAL |

**Exceeding limits causes function failures**

#### Field Name Constraints

```typescript
// ✅ VALID field names
{
  name: "value",
  userName: "value",
  user_name: "value",
  field123: "value"
}

// ❌ INVALID field names
{
  "": "value",           // Empty string
  "$reserved": "value",  // Starts with $
  "_system": "value",    // Starts with _ (reserved for system)
}
```

#### Record Key Constraints

```typescript
// ✅ VALID record keys (ASCII only)
preferences: v.record(v.string(), v.any())
{
  "theme": "dark",
  "language": "en",
  "notifications_enabled": "true"
}

// ❌ INVALID record keys
{
  "": "value",           // Empty string
  "$key": "value",       // Starts with $
  "_key": "value",       // Starts with _
  "café": "value",       // Non-ASCII characters
}
```

### Special Behaviors

#### Undefined Handling

```typescript
// ⚠️ WARNING: undefined is NOT a valid Convex value

export const returnUndefined = query({
  handler: async (ctx) => {
    return undefined  // Becomes null on client!
  }
})

// Client receives:
const result = useQuery(api.returnUndefined)
console.log(result)  // null (not undefined)

// ✅ RECOMMENDATION: Use null explicitly
export const returnNull = query({
  handler: async (ctx) => {
    return null  // Clear intent
  }
})
```

#### Date/Time Storage

```typescript
// ⚠️ No native date type in Convex

// ✅ RECOMMENDED: Store as number (milliseconds)
export default defineSchema({
  events: defineTable({
    name: v.string(),
    startTime: v.number(),  // Date.now()
    endTime: v.number(),
  })
})

// Usage:
await ctx.db.insert("events", {
  name: "Meeting",
  startTime: Date.now(),
  endTime: Date.now() + 3600000  // +1 hour
})

// Alternative: ISO8601 strings for calendar dates
export default defineSchema({
  events: defineTable({
    name: v.string(),
    date: v.string(),  // "2025-11-05"
  })
})
```

#### System Fields

```typescript
// Automatic system fields (DO NOT define in schema)
{
  _id: Id<"tableName">,      // Unique identifier
  _creationTime: number,      // Creation timestamp (ms)
  // ... your fields ...
}

// ✅ Access in code
const doc = await ctx.db.get(docId)
console.log(doc._id)
console.log(doc._creationTime)

// ❌ DON'T include in schema
export default defineSchema({
  users: defineTable({
    _id: v.id("users"),        // ERROR: Don't define this!
    _creationTime: v.number(), // ERROR: Don't define this!
    name: v.string(),
  })
})
```

### Table Name Constraints

```typescript
// ✅ VALID table names
users
user_profiles
userProfiles
users123

// ❌ INVALID table names
_users           // Cannot start with underscore
user-profiles    // No hyphens
user profiles    // No spaces
123users         // Cannot start with number
```

---

## Code Organization Standards

### 🟡 MEDIUM: Recommended Structure

```
convex/
├── schema.ts                 # Database schema definition
├── _generated/              # Generated types (DO NOT EDIT)
│   ├── api.d.ts
│   ├── dataModel.d.ts
│   └── server.d.ts
├── auth.config.ts           # Authentication configuration
├── crons.ts                 # Scheduled functions
│
├── lib/                     # Shared utilities
│   ├── validators.ts        # Reusable validators
│   ├── helpers.ts           # Pure helper functions
│   └── constants.ts         # Shared constants
│
├── model/                   # Business logic (domain layer)
│   ├── users.ts            # User domain logic
│   ├── posts.ts            # Post domain logic
│   ├── comments.ts         # Comment domain logic
│   └── teams.ts            # Team domain logic
│
├── api/                     # Public API functions
│   ├── users.ts            # User queries/mutations
│   ├── posts.ts            # Post queries/mutations
│   ├── comments.ts         # Comment queries/mutations
│   └── teams.ts            # Team queries/mutations
│
└── internal/                # Internal functions
    ├── notifications.ts     # Notification processing
    ├── cleanup.ts          # Cleanup tasks
    └── migrations.ts       # Data migrations
```

### Helper Functions Pattern

#### Extract Business Logic

```typescript
// convex/model/users.ts
import { QueryCtx, MutationCtx } from "../_generated/server"
import { Doc, Id } from "../_generated/dataModel"

// ✅ Type-annotated helper functions
export async function getUser(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">
): Promise<Doc<"users"> | null> {
  return await ctx.db.get(userId)
}

export async function getUserByEmail(
  ctx: QueryCtx | MutationCtx,
  email: string
): Promise<Doc<"users"> | null> {
  return await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .first()
}

export async function updateUserProfile(
  ctx: MutationCtx,
  userId: Id<"users">,
  data: { name?: string; bio?: string }
): Promise<void> {
  await ctx.db.patch(userId, data)
}

export async function getUserPosts(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">
): Promise<Doc<"posts">[]> {
  return await ctx.db
    .query("posts")
    .withIndex("by_author", (q) => q.eq("authorId", userId))
    .collect()
}
```

#### Thin API Wrappers

```typescript
// convex/api/users.ts
import { query, mutation } from "../_generated/server"
import { v } from "convex/values"
import * as Users from "../model/users"

// ✅ Thin wrapper around business logic
export const get = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await Users.getUser(ctx, args.userId)
  }
})

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await Users.getUserByEmail(ctx, args.email)
  }
})

export const updateProfile = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    bio: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Access control
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Unauthorized")
    if (identity.subject !== args.userId) throw new Error("Forbidden")

    // Delegate to business logic
    await Users.updateUserProfile(ctx, args.userId, {
      name: args.name,
      bio: args.bio,
    })
  }
})

export const getWithPosts = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await Users.getUser(ctx, args.userId)
    const posts = await Users.getUserPosts(ctx, args.userId)
    return { user, posts }
  }
})
```

### Benefits of This Pattern

1. **✅ Easier Refactoring**
   - Business logic separated from API surface
   - Change implementation without changing API

2. **✅ Access Control Auditing**
   - Clear separation: API layer = auth, model layer = logic
   - Easy to verify security in API files

3. **✅ Code Reuse**
   - Helpers callable from multiple functions
   - Avoid duplication

4. **✅ Testing**
   - Business logic testable independently
   - Mock database context

5. **✅ Type Safety**
   - Strong typing throughout
   - Context types ensure correct usage

### Reusable Validators

```typescript
// convex/lib/validators.ts
import { v } from "convex/values"

// Common validator patterns
export const emailValidator = v.string()  // Could add regex validation

export const urlValidator = v.string()

export const paginationArgsValidator = {
  paginationOpts: paginationOptsValidator
}

export const timestampValidator = v.number()

export const statusValidator = v.union(
  v.literal("active"),
  v.literal("inactive"),
  v.literal("archived")
)

// Reuse in functions
import { statusValidator } from "./lib/validators"

export const updateStatus = mutation({
  args: {
    id: v.id("items"),
    status: statusValidator,  // Reused validator
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status })
  }
})
```

---

## Comprehensive Audit Checklist

### TypeScript Configuration ✅

- [ ] TypeScript version ≥ 5.0.3
- [ ] All Convex functions use `.ts` extension
- [ ] Generated types imported from `_generated/`
- [ ] `no-floating-promises` ESLint rule enabled
- [ ] Validators used for type inference (not manual annotations)

### Schema Definition ✅

- [ ] `schema.ts` file exists in `convex/` directory
- [ ] All production tables defined with `defineTable()`
- [ ] All fields have validators
- [ ] No `_id` or `_creationTime` in schema definitions
- [ ] Circular references handled with optional fields
- [ ] Schema validation enabled (default)
- [ ] Table names follow constraints (alphanumeric + underscore)

### Index Configuration ✅

- [ ] Indexes defined for all filtered queries
- [ ] No redundant indexes (compound indexes utilized)
- [ ] Compound index field order matches query patterns
- [ ] Staged indexes used for large table migrations
- [ ] Index limits respected:
  - [ ] Maximum 32 indexes per table
  - [ ] Maximum 16 fields per index
- [ ] No duplicate fields in indexes
- [ ] No reserved fields (_prefix) in indexes

### Database Operations ✅

- [ ] `.withIndex()` used instead of `.filter()` for large datasets
- [ ] `.collect()` only used for small, bounded result sets (< 1000)
- [ ] Pagination implemented for large lists
- [ ] Hot/cold data separated into different tables
- [ ] Single document retrieval uses `db.get()`
- [ ] All database operations properly awaited
- [ ] Cascade deletes implemented where needed

### Query Functions ✅

- [ ] Used for all read operations
- [ ] No database writes in queries
- [ ] No external API calls in queries
- [ ] Deterministic (no `Date.now()`, `Math.random()`, etc.)
- [ ] Stay under 100ms execution time
- [ ] Process fewer than several hundred records
- [ ] Result sets limited appropriately

### Mutation Functions ✅

- [ ] Used for all write operations
- [ ] Transaction guarantees understood
- [ ] Error handling implemented (triggers rollback)
- [ ] Stay under 100ms execution time
- [ ] Actions scheduled via `ctx.scheduler` when needed
- [ ] No external API calls in mutations

### Action Functions ✅

- [ ] Used ONLY for external API calls
- [ ] Scheduled from mutations (not called directly from client)
- [ ] All promises properly awaited
- [ ] Database interactions via `ctx.runQuery`/`ctx.runMutation`
- [ ] Sequential `ctx.run*` calls combined when possible
- [ ] Runtime chosen appropriately (Convex vs Node.js)
- [ ] Error handling implemented
- [ ] No helper logic wrapped in action functions

### Validation & Security ✅

- [ ] All public functions have argument validators
- [ ] All document IDs validated with `v.id("tableName")`
- [ ] Public functions have return value validators
- [ ] No `v.any()` in public function arguments
- [ ] Authentication checked in protected functions
- [ ] `ctx.auth.getUserIdentity()` used for user identification
- [ ] No spoofable parameters (email, username) trusted
- [ ] Granular functions for fine-grained permissions
- [ ] Object validation prevents extra fields

### Access Control ✅

- [ ] Authentication verified before sensitive operations
- [ ] `identity.subject` used for user identification
- [ ] Ownership verified before modifications
- [ ] Internal functions used for scheduled tasks
- [ ] Public functions not used in crons
- [ ] Error messages don't leak sensitive information

### Performance Optimization ✅

- [ ] Indexes defined for common query patterns
- [ ] Query results limited with `.take()` or `.paginate()`
- [ ] Denormalization used where appropriate
- [ ] Hot/cold data separated
- [ ] Queue pattern used for high-throughput operations
- [ ] Client-side debouncing for rapid changes
- [ ] Consistent transactions (avoid sequential `ctx.run*` calls)
- [ ] No full table scans on large tables

### Code Organization ✅

- [ ] Business logic in `convex/model/` or similar
- [ ] API functions in `convex/api/` or root
- [ ] Shared utilities in `convex/lib/`
- [ ] Reusable validators extracted
- [ ] Helper functions typed with Context types
- [ ] Clear separation of concerns
- [ ] Internal functions in dedicated directory/files

### Anti-Pattern Prevention ✅

- [ ] No unawaited promises
- [ ] No `.filter()` on large datasets
- [ ] No `.collect()` on unbounded queries
- [ ] No missing validators on public functions
- [ ] No spoofable access control
- [ ] No public function calls in crons
- [ ] No sequential mutations in actions
- [ ] No redundant indexes
- [ ] No unnecessary `ctx.runAction()` calls
- [ ] No direct client → action calls for critical operations
- [ ] No undefined return values (use null)
- [ ] No manual type annotations when validators exist

### Data Types & Constraints ✅

- [ ] All values under 1 MB
- [ ] Nesting depth ≤ 16 levels
- [ ] Array elements ≤ 8,192
- [ ] Object entries ≤ 1,024
- [ ] Field names don't start with $ or _
- [ ] Record keys are ASCII only
- [ ] Dates stored as numbers (milliseconds)
- [ ] No undefined values (use null)

### Runtime Configuration ✅

- [ ] Appropriate runtime chosen (Convex vs Node.js)
- [ ] `"use node"` directive for Node.js actions
- [ ] Memory limits understood (64MB vs 512MB)
- [ ] Timeout limits respected (10 minutes max for actions)
- [ ] Concurrency limits understood (1000 concurrent actions)

---

## Normalization Process

### Phase 1: Discovery & Assessment

#### Step 1.1: Schema Audit

```bash
# Review all tables in Convex dashboard
# Document findings:
```

**Checklist:**
- [ ] List all tables and their purposes
- [ ] Document existing field types (check inferred schema)
- [ ] Identify tables without explicit schemas
- [ ] Note tables with > 10,000 documents
- [ ] Find fields that change frequently (hot data)

#### Step 1.2: Index Audit

```typescript
// For each table, document:
// - Existing indexes
// - Query patterns
// - Missing indexes
// - Redundant indexes
```

**Checklist:**
- [ ] List all indexes per table
- [ ] Identify queries without indexes (check logs)
- [ ] Find redundant indexes (compound index duplication)
- [ ] Document slow queries (> 100ms)
- [ ] Check index backfill status

#### Step 1.3: Function Audit

```bash
# List all Convex functions
# Categorize by type: query, mutation, action
```

**Checklist:**
- [ ] List all public functions
- [ ] Identify functions without validators
- [ ] Find queries that should be internal
- [ ] Locate actions called directly from client
- [ ] Check for unawaited promises
- [ ] Find functions > 100ms execution time

#### Step 1.4: Security Audit

**Checklist:**
- [ ] Functions without authentication checks
- [ ] Functions trusting spoofable parameters
- [ ] Public functions in cron jobs
- [ ] Functions without input validation
- [ ] Functions exposing sensitive data
- [ ] Missing return value validators

### Phase 2: Schema Formalization

#### Step 2.1: Create Schema Definition

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  // Define all tables progressively
  users: defineTable({
    name: v.string(),
    email: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("user")
    ),
  })
    .index("by_email", ["email"])
})
```

**Process:**
1. Start with most critical tables
2. Review inferred schema in dashboard
3. Define explicit validators
4. Add optional fields where needed
5. Test with existing data

#### Step 2.2: Add Required Indexes

```typescript
// Analyze query patterns from logs
// Add indexes for filtered queries

export default defineSchema({
  posts: defineTable({
    title: v.string(),
    authorId: v.id("users"),
    status: v.string(),
    publishedAt: v.number(),
  })
    // Add indexes based on query patterns
    .index("by_author", ["authorId"])
    .index("by_status", ["status"])
    .index("by_author_status", ["authorId", "status"])
    .index("by_published", ["publishedAt"])
})
```

#### Step 2.3: Remove Redundant Indexes

```typescript
// Before:
.index("by_name", ["name"])
.index("by_name_category", ["name", "category"])

// After (remove redundant):
.index("by_name_category", ["name", "category"])
// This covers both "by_name" and "by_name_category" queries
```

#### Step 2.4: Handle Large Tables

```typescript
// For tables > 100,000 documents, use staged indexes
export default defineSchema({
  messages: defineTable({
    channelId: v.id("channels"),
    text: v.string(),
  })
    .index("by_channel", {
      fields: ["channelId"],
      staged: true  // Don't block deployment
    })
})

// Monitor backfill progress
// Remove staged: true when complete
```

### Phase 3: Function Refactoring

#### Step 3.1: Add Validators

```typescript
// Before:
export const updateUser = mutation({
  handler: async (ctx, args: any) => {
    await ctx.db.patch(args.userId, args.data)
  }
})

// After:
export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    bio: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      name: args.name,
      bio: args.bio,
    })
  }
})
```

#### Step 3.2: Extract Business Logic

```typescript
// Before: Logic in API function
export const createPost = mutation({
  args: { title: v.string(), body: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Unauthorized")

    const postId = await ctx.db.insert("posts", {
      title: args.title,
      body: args.body,
      authorId: identity.subject,
    })

    await ctx.scheduler.runAfter(0, internal.notify, { postId })
    return postId
  }
})

// After: Extract to model layer
// convex/model/posts.ts
export async function createPost(
  ctx: MutationCtx,
  data: { title: string; body: string; authorId: string }
) {
  return await ctx.db.insert("posts", {
    title: data.title,
    body: data.body,
    authorId: data.authorId,
    isPublished: false,
    viewCount: 0,
  })
}

// convex/api/posts.ts
export const create = mutation({
  args: { title: v.string(), body: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Unauthorized")

    const postId = await Posts.createPost(ctx, {
      ...args,
      authorId: identity.subject,
    })

    await ctx.scheduler.runAfter(0, internal.notify, { postId })
    return postId
  }
})
```

#### Step 3.3: Convert to Internal Functions

```typescript
// Before: Public function in cron
export const cleanupOldData = mutation({
  handler: async (ctx) => {
    // Cleanup logic
  }
})

// After: Internal function
import { internalMutation } from "./_generated/server"

export const cleanupOldData = internalMutation({
  handler: async (ctx) => {
    // Cleanup logic
  }
})

// Update crons.ts
import { internal } from "./_generated/api"

export default cronJobs.daily(
  "cleanup",
  { hourUTC: 2 },
  internal.cleanup.cleanupOldData  // Use internal reference
)
```

#### Step 3.4: Fix Action Patterns

```typescript
// Before: Direct client → action
export const processPayment = action({
  args: { amount: v.number() },
  handler: async (ctx, args) => {
    const result = await fetch("https://payment-api.example.com")
    return result
  }
})

// Client:
// const action = useAction(api.processPayment)
// await action({ amount: 100 })  // RISKY!

// After: Mutation → scheduled action
export const initiatePayment = mutation({
  args: { orderId: v.id("orders"), amount: v.number() },
  handler: async (ctx, args) => {
    const paymentId = await ctx.db.insert("payments", {
      orderId: args.orderId,
      amount: args.amount,
      status: "pending",
    })

    await ctx.scheduler.runAfter(
      0,
      internal.payments.processPayment,
      { paymentId }
    )

    return paymentId
  }
})

export const processPayment = internalAction({
  args: { paymentId: v.id("payments") },
  handler: async (ctx, args) => {
    const result = await fetch("https://payment-api.example.com")

    await ctx.runMutation(internal.payments.updateStatus, {
      paymentId: args.paymentId,
      result,
    })
  }
})
```

### Phase 4: Query Optimization

#### Step 4.1: Add Indexes for Filters

```typescript
// Before: Filter without index
export const getPublishedPosts = query({
  handler: async (ctx) => {
    const all = await ctx.db.query("posts").collect()
    return all.filter(p => p.isPublished)
  }
})

// After: Index-based query
// 1. Add index to schema
posts: defineTable({
  // ...
}).index("by_published", ["isPublished"])

// 2. Update query
export const getPublishedPosts = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("posts")
      .withIndex("by_published", (q) => q.eq("isPublished", true))
      .collect()
  }
})
```

#### Step 4.2: Add Pagination

```typescript
// Before: Unbounded collect
export const listPosts = query({
  handler: async (ctx) => {
    return await ctx.db.query("posts").collect()
  }
})

// After: Paginated query
import { paginationOptsValidator } from "convex/server"

export const listPosts = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("posts")
      .withIndex("by_creation_time")
      .order("desc")
      .paginate(args.paginationOpts)
  }
})
```

#### Step 4.3: Split Hot/Cold Data

```typescript
// Before: Single table
users: defineTable({
  name: v.string(),
  lastSeen: v.number(),  // Updated frequently!
})

// After: Separate tables
users: defineTable({
  name: v.string(),
  email: v.string(),
}),

userActivity: defineTable({
  userId: v.id("users"),
  lastSeen: v.number(),
  loginCount: v.number(),
}).index("by_user", ["userId"])
```

### Phase 5: Security Hardening

#### Step 5.1: Add Authentication

```typescript
// Before: No auth check
export const updateProfile = mutation({
  args: { userId: v.id("users"), name: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { name: args.name })
  }
})

// After: Auth check
export const updateProfile = mutation({
  args: { userId: v.id("users"), name: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Unauthorized")
    if (identity.subject !== args.userId) throw new Error("Forbidden")

    await ctx.db.patch(args.userId, { name: args.name })
  }
})
```

#### Step 5.2: Remove Spoofable Parameters

```typescript
// Before: Trusting email parameter
export const getCurrentUser = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique()
  }
})

// After: Using authenticated context
export const getCurrentUser = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    return await ctx.db
      .query("users")
      .withIndex("by_subject", (q) => q.eq("subject", identity.subject))
      .unique()
  }
})
```

### Phase 6: Testing & Validation

#### Step 6.1: Test Functions

```bash
# Test in Convex dashboard
# - Call each function with valid inputs
# - Test edge cases (null, empty, invalid IDs)
# - Verify error handling
```

#### Step 6.2: Verify Schema

```bash
# Deploy and check for schema violations
npx convex deploy

# Dashboard will show any validation errors
# Fix data or adjust schema as needed
```

#### Step 6.3: Monitor Performance

```bash
# Check function execution times
# - Look for functions > 100ms
# - Verify index usage
# - Monitor query patterns
```

### Phase 7: Documentation

#### Step 7.1: Document Schema

```typescript
// Add comments to schema
export default defineSchema({
  /**
   * Users table stores core user profile information.
   * See userActivity table for frequently updated fields.
   */
  users: defineTable({
    name: v.string(),          // Display name
    email: v.string(),         // Login email (unique)
    role: v.union(             // User role
      v.literal("admin"),
      v.literal("user")
    ),
  })
    .index("by_email", ["email"])  // For login
})
```

#### Step 7.2: Document API Functions

```typescript
/**
 * Creates a new blog post for the authenticated user.
 *
 * @param title - Post title (required)
 * @param body - Post content (required)
 * @param tags - Post tags (optional)
 * @returns Post ID
 *
 * @throws Unauthorized if user not authenticated
 */
export const createPost = mutation({
  args: {
    title: v.string(),
    body: v.string(),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Implementation
  }
})
```

---

## Anti-Pattern Detection Guide

### 🔴 CRITICAL Anti-Patterns

#### 1. Unawaited Promises

**Detection:**
```typescript
// ❌ Pattern to find:
ctx.db.insert(...)  // Not awaited
ctx.scheduler.runAfter(...)  // Not awaited
ctx.runMutation(...)  // Not awaited
```

**Fix:**
```typescript
// ✅ Always await:
await ctx.db.insert(...)
await ctx.scheduler.runAfter(...)
await ctx.runMutation(...)
```

**Enable ESLint rule:**
```json
{
  "@typescript-eslint/no-floating-promises": "error"
}
```

#### 2. Unbounded Collect

**Detection:**
```typescript
// ❌ Pattern to find:
.query("tableName").collect()
// Without preceding .take() or .withIndex() + small result set
```

**Fix:**
```typescript
// ✅ Use pagination:
.query("tableName").paginate(opts)

// ✅ Or use limits:
.query("tableName").take(100)
```

#### 3. Missing Validators

**Detection:**
```typescript
// ❌ Pattern to find:
export const func = mutation({
  handler: async (ctx, args: any) => {  // No args object!
  handler: async (ctx, args) => {       // No validator!
```

**Fix:**
```typescript
// ✅ Always add validators:
export const func = mutation({
  args: { userId: v.id("users"), name: v.string() },
  handler: async (ctx, args) => {
```

#### 4. Spoofable Access Control

**Detection:**
```typescript
// ❌ Pattern to find:
args: { userEmail: v.string(), userId: v.string() }
// Any user-supplied identifier used for auth
```

**Fix:**
```typescript
// ✅ Use authenticated context:
const identity = await ctx.auth.getUserIdentity()
if (!identity) throw new Error("Unauthorized")
const userId = identity.subject  // Server-verified
```

#### 5. Public Functions in Crons

**Detection:**
```typescript
// ❌ Pattern to find (in crons.ts):
api.functionName  // Public function reference
```

**Fix:**
```typescript
// ✅ Use internal functions:
internal.functionName  // Internal function reference
```

#### 6. Filter Without Index

**Detection:**
```typescript
// ❌ Pattern to find:
.query("tableName").filter(q => ...)  // Using .filter()
// OR:
const all = await ctx.db.query("tableName").collect()
return all.filter(...)  // Filter in memory
```

**Fix:**
```typescript
// ✅ Add index and use it:
.query("tableName")
  .withIndex("indexName", (q) => q.eq("field", value))
  .collect()
```

#### 7. Redundant Indexes

**Detection:**
```typescript
// ❌ Pattern to find:
.index("by_field1", ["field1"])
.index("by_field1_field2", ["field1", "field2"])
// Second index makes first redundant
```

**Fix:**
```typescript
// ✅ Remove redundant index:
.index("by_field1_field2", ["field1", "field2"])
// Covers both query patterns
```

#### 8. Sequential Mutations in Actions

**Detection:**
```typescript
// ❌ Pattern to find:
await ctx.runMutation(api.update1, {})
await ctx.runMutation(api.update2, {})
// Multiple mutations in sequence
```

**Fix:**
```typescript
// ✅ Combine into single mutation:
await ctx.runMutation(api.updateBoth, {})
```

#### 9. Direct Client → Action Calls

**Detection:**
```typescript
// ❌ Pattern to find (client code):
const action = useAction(api.criticalAction)
await action({ data })
// Direct action call for critical operations
```

**Fix:**
```typescript
// ✅ Use mutation → scheduled action:
const mutation = useMutation(api.initiateCriticalOperation)
await mutation({ data })

// Server:
export const initiateCriticalOperation = mutation({
  handler: async (ctx, args) => {
    await ctx.scheduler.runAfter(0, internal.action, args)
  }
})
```

#### 10. Non-Deterministic Queries

**Detection:**
```typescript
// ❌ Pattern to find:
export const func = query({
  handler: async (ctx) => {
    return {
      timestamp: Date.now(),        // Non-deterministic!
      random: Math.random(),        // Non-deterministic!
      data: await fetch(...)        // External call!
    }
  }
})
```

**Fix:**
```typescript
// ✅ Make deterministic:
export const func = query({
  handler: async (ctx) => {
    return await ctx.db.query("table").collect()
    // Only database reads
  }
})

// ✅ Store timestamp in database:
export const create = mutation({
  handler: async (ctx) => {
    return await ctx.db.insert("table", {
      createdAt: Date.now()  // OK in mutation!
    })
  }
})
```

### 🟠 HIGH Priority Anti-Patterns

#### 11. Hot/Cold Data Mixing

**Detection:**
- Tables with fields updated at very different frequencies
- Queries that only need cold data but get hot data too

**Fix:**
- Split into separate tables
- Link with foreign key references

#### 12. Missing Pagination

**Detection:**
- Queries on tables with > 1000 documents
- No `.take()` or `.paginate()` usage
- UI showing unbounded lists

**Fix:**
- Implement pagination for large result sets
- Use `.take()` for known small sets

#### 13. Unnecessary Action Wrapping

**Detection:**
```typescript
// ❌ Pattern:
await ctx.runAction(internal.helper, {})
// Where helper is just TypeScript logic
```

**Fix:**
```typescript
// ✅ Use plain function:
import { helper } from "./helpers"
await helper({})
```

### 🟡 MEDIUM Priority Anti-Patterns

#### 14. Manual Type Annotations

**Detection:**
```typescript
// ❌ Pattern:
handler: async (ctx, args: { name: string }) => {
// When args validator already exists
```

**Fix:**
```typescript
// ✅ Let validator drive types:
args: { name: v.string() },
handler: async (ctx, args) => {
// TypeScript infers args.name is string
```

#### 15. Duplicate Business Logic

**Detection:**
- Same logic repeated across multiple functions
- Copy-paste code patterns

**Fix:**
- Extract to helper functions in `convex/model/`
- Reuse across API functions

---

## Conclusion

This guide provides a comprehensive framework for auditing and normalizing Convex implementations. Use the checklists systematically to ensure your Convex setup follows best practices for security, performance, and maintainability.

### Key Takeaways

1. **Always validate inputs** - TypeScript types don't exist at runtime
2. **Use indexes** - Avoid full table scans
3. **Separate hot/cold data** - Prevent unnecessary query reruns
4. **Follow the mutation → action pattern** - Ensure exactly-once execution
5. **Extract business logic** - Maintain clean architecture
6. **Use internal functions** - For scheduled tasks and crons
7. **Implement pagination** - For large result sets
8. **Check authentication** - Before sensitive operations
9. **Await all promises** - Prevent silent failures
10. **Monitor performance** - Keep functions under 100ms

### Next Steps

1. Run through the comprehensive audit checklist
2. Prioritize fixes by severity (🔴 → 🟠 → 🟡 → 🟢)
3. Follow the normalization process phase by phase
4. Test thoroughly after each change
5. Document your changes
6. Train team on best practices

---

**Document Version:** 1.0
**Last Updated:** 2025-11-05
**Maintained By:** Development Team
