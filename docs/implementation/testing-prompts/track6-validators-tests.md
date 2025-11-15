# Track 6: Validators Tests

## Objective
Create comprehensive tests for `web/convex/validators.ts` - validation schemas and business logic helpers

## Context
- **File to test**: `web/convex/validators.ts`
- **Test file to create**: `web/convex/validators.test.ts`
- **Testing framework**: Vitest with convex-test
- **Schema reference**: Lines 2821-2881 in phase0-convex-data-layer.md

## Background
The validators module provides:
1. Reusable validation schemas (taskValidator, expenseValidator, budgetValidator)
2. Business logic validation functions
3. Type-safe validators using Convex `v` schema

---

## Validators to Test

### 1. taskValidator Object

Test the validation schemas:

#### `taskValidator.category`
- ✅ Accepts valid categories: "venue", "catering", "photography", "music", "decor", "invitations", "transportation", "accommodation", "other"
- ✅ Rejects invalid categories
- ✅ Type checking works correctly

#### `taskValidator.priority`
- ✅ Accepts valid priorities: "low", "medium", "high", "urgent"
- ✅ Rejects invalid priorities
- ✅ Type checking works correctly

#### `taskValidator.status`
- ✅ Accepts valid statuses: "todo", "in_progress", "blocked", "completed", "cancelled"
- ✅ Rejects invalid statuses
- ✅ Type checking works correctly

**Test Pattern:**
```typescript
import { describe, it, expect } from "vitest";
import { taskValidator, expenseValidator, budgetValidator } from "./validators";
import { v } from "convex/values";

describe("validators", () => {
  describe("taskValidator", () => {
    describe("category", () => {
      it("should accept valid categories", () => {
        const validCategories = [
          "venue", "catering", "photography", "music",
          "decor", "invitations", "transportation",
          "accommodation", "other"
        ];

        validCategories.forEach(category => {
          // Test that validator accepts the value
          expect(() => {
            taskValidator.category.validate(category);
          }).not.toThrow();
        });
      });

      it("should reject invalid categories", () => {
        const invalidCategories = ["invalid", "test", ""];

        invalidCategories.forEach(category => {
          expect(() => {
            taskValidator.category.validate(category);
          }).toThrow();
        });
      });
    });
  });
});
```

---

### 2. expenseValidator Object

#### `expenseValidator.amount`
- ✅ Accepts positive numbers
- ✅ Rejects zero
- ✅ Rejects negative numbers
- ✅ Rejects NaN
- ✅ Rejects Infinity

#### `expenseValidator.currency`
- ✅ Accepts valid ISO 4217 codes (USD, EUR, GBP, etc.)
- ✅ Accepts string format
- ✅ Type checking works correctly

#### `expenseValidator.category`
- ✅ Accepts valid expense categories (matches task categories)
- ✅ Rejects invalid categories
- ✅ Type checking works correctly

---

### 3. budgetValidator Object

#### `budgetValidator.total`
- ✅ Accepts positive numbers
- ✅ Rejects zero
- ✅ Rejects negative numbers
- ✅ Rejects NaN
- ✅ Rejects Infinity

#### `budgetValidator.currency`
- ✅ Accepts valid currency strings
- ✅ Type checking works correctly

---

## Business Logic Functions to Test

### 4. validateTaskDeadline(deadline, eventDate)

**Purpose**: Ensures task deadline is before or on event date

**Test Cases:**
- ✅ Returns true when deadline < eventDate
- ✅ Returns true when deadline === eventDate
- ✅ Returns false when deadline > eventDate
- ✅ Handles edge case: deadline 1 day before event
- ✅ Handles edge case: deadline 1 day after event

**Test Pattern:**
```typescript
import { validateTaskDeadline } from "./validators";

describe("validateTaskDeadline", () => {
  it("should return true when deadline is before event date", () => {
    const eventDate = new Date("2025-12-31").getTime();
    const deadline = new Date("2025-12-30").getTime();

    expect(validateTaskDeadline(deadline, eventDate)).toBe(true);
  });

  it("should return true when deadline equals event date", () => {
    const eventDate = new Date("2025-12-31").getTime();
    const deadline = eventDate;

    expect(validateTaskDeadline(deadline, eventDate)).toBe(true);
  });

  it("should return false when deadline is after event date", () => {
    const eventDate = new Date("2025-12-31").getTime();
    const deadline = new Date("2026-01-01").getTime();

    expect(validateTaskDeadline(deadline, eventDate)).toBe(false);
  });
});
```

---

### 5. validateBudgetAllocation(allocated, total)

**Purpose**: Ensures sum of allocated amounts doesn't exceed total budget

**Test Cases:**
- ✅ Returns true when sum of allocated < total
- ✅ Returns true when sum of allocated === total
- ✅ Returns false when sum of allocated > total
- ✅ Handles empty allocation object (returns true)
- ✅ Handles partial allocation (some categories allocated)
- ✅ Handles complex allocation (all categories with various amounts)

**Test Pattern:**
```typescript
import { validateBudgetAllocation } from "./validators";

describe("validateBudgetAllocation", () => {
  it("should return true when allocated sum is less than total", () => {
    const allocated = {
      venue: 5000,
      catering: 3000,
      photography: 2000,
    };
    const total = 15000;

    expect(validateBudgetAllocation(allocated, total)).toBe(true);
  });

  it("should return true when allocated sum equals total", () => {
    const allocated = {
      venue: 5000,
      catering: 5000,
      photography: 5000,
    };
    const total = 15000;

    expect(validateBudgetAllocation(allocated, total)).toBe(true);
  });

  it("should return false when allocated sum exceeds total", () => {
    const allocated = {
      venue: 10000,
      catering: 8000,
      photography: 5000,
    };
    const total = 15000;

    expect(validateBudgetAllocation(allocated, total)).toBe(false);
  });

  it("should handle empty allocation object", () => {
    expect(validateBudgetAllocation({}, 10000)).toBe(true);
  });

  it("should handle partial allocation", () => {
    const allocated = {
      venue: 5000,
      // Other categories not allocated
    };
    const total = 15000;

    expect(validateBudgetAllocation(allocated, total)).toBe(true);
  });
});
```

---

### 6. validateExpenseAmount(amount)

**Purpose**: Ensures expense amount is positive and finite

**Test Cases:**
- ✅ Returns true for positive numbers (1, 100, 0.01, 99999.99)
- ✅ Returns false for zero
- ✅ Returns false for negative numbers
- ✅ Returns false for NaN
- ✅ Returns false for Infinity
- ✅ Returns false for -Infinity
- ✅ Handles very small positive numbers (0.001)
- ✅ Handles very large positive numbers (1000000)

**Test Pattern:**
```typescript
import { validateExpenseAmount } from "./validators";

describe("validateExpenseAmount", () => {
  it("should return true for positive numbers", () => {
    const validAmounts = [1, 100, 0.01, 99999.99, 0.001, 1000000];

    validAmounts.forEach(amount => {
      expect(validateExpenseAmount(amount)).toBe(true);
    });
  });

  it("should return false for zero", () => {
    expect(validateExpenseAmount(0)).toBe(false);
  });

  it("should return false for negative numbers", () => {
    expect(validateExpenseAmount(-1)).toBe(false);
    expect(validateExpenseAmount(-100)).toBe(false);
  });

  it("should return false for NaN", () => {
    expect(validateExpenseAmount(NaN)).toBe(false);
  });

  it("should return false for Infinity", () => {
    expect(validateExpenseAmount(Infinity)).toBe(false);
    expect(validateExpenseAmount(-Infinity)).toBe(false);
  });
});
```

---

## Additional Validator Tests

### Integration with Mutations
Test that validators are actually used in mutations:

```typescript
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

describe("validators integration", () => {
  it("should reject invalid task category in create mutation", async () => {
    const t = convexTest(schema);

    await expect(
      t.mutation(api.tasks.create, {
        title: "Test Task",
        category: "invalid_category", // Invalid
        eventId: "test-event-id",
        roomId: "test-room-id",
        createdBy: "test-user-id",
      })
    ).rejects.toThrow();
  });

  it("should reject invalid expense amount", async () => {
    const t = convexTest(schema);

    await expect(
      t.mutation(api.expenses.create, {
        description: "Test Expense",
        amount: -100, // Invalid (negative)
        currency: "USD",
        eventId: "test-event-id",
        category: "venue",
        paidBy: "test-user-id",
      })
    ).rejects.toThrow();
  });
});
```

---

## Test Structure

```typescript
import { describe, it, expect } from "vitest";
import {
  taskValidator,
  expenseValidator,
  budgetValidator,
  validateTaskDeadline,
  validateBudgetAllocation,
  validateExpenseAmount,
} from "./validators";

describe("validators", () => {
  describe("taskValidator", () => {
    describe("category", () => { /* tests */ });
    describe("priority", () => { /* tests */ });
    describe("status", () => { /* tests */ });
  });

  describe("expenseValidator", () => {
    describe("amount", () => { /* tests */ });
    describe("currency", () => { /* tests */ });
    describe("category", () => { /* tests */ });
  });

  describe("budgetValidator", () => {
    describe("total", () => { /* tests */ });
    describe("currency", () => { /* tests */ });
  });

  describe("Business Logic Functions", () => {
    describe("validateTaskDeadline", () => { /* tests */ });
    describe("validateBudgetAllocation", () => { /* tests */ });
    describe("validateExpenseAmount", () => { /* tests */ });
  });

  describe("Integration with Mutations", () => { /* tests */ });
});
```

---

## Acceptance Criteria

- ✅ Test file created: `web/convex/validators.test.ts`
- ✅ All validator schemas tested (taskValidator, expenseValidator, budgetValidator)
- ✅ All business logic functions tested (3 functions)
- ✅ Valid input tests (should pass)
- ✅ Invalid input tests (should fail)
- ✅ Edge cases covered (zero, negative, NaN, Infinity, empty objects)
- ✅ Integration tests verify validators are used in mutations
- ✅ 40-50 test cases total
- ✅ All tests passing
- ✅ No TypeScript errors
- ✅ Code coverage ≥ 95% on validators.ts (validators are simple, should be near 100%)

---

## Deliverable

Complete test file `web/convex/validators.test.ts` with:
- ~300-400 lines of comprehensive tests
- All validator schemas tested
- All business logic functions tested
- Integration tests
- Edge case coverage
- All tests passing
