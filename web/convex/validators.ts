import { v } from "convex/values";

/**
 * Reusable validation schemas for tasks
 * Use these in mutation args for consistent validation
 */
export const taskValidator = {
  title: v.string(), // Required, min 3 chars
  category: v.union(
    v.literal("venue"),
    v.literal("catering"),
    v.literal("photography"),
    v.literal("music"),
    v.literal("decor"),
    v.literal("invitations"),
    v.literal("transportation"),
    v.literal("accommodation"),
    v.literal("other")
  ),
  priority: v.union(
    v.literal("low"),
    v.literal("medium"),
    v.literal("high"),
    v.literal("urgent")
  ),
  status: v.union(
    v.literal("todo"),
    v.literal("in_progress"),
    v.literal("blocked"),
    v.literal("completed"),
    v.literal("cancelled")
  ),
};

/**
 * Reusable validation schemas for expenses
 * Use these in mutation args for consistent validation
 */
export const expenseValidator = {
  amount: v.number(), // Must be > 0
  currency: v.string(), // ISO 4217 code
  category: v.string(), // Must match task categories
};

/**
 * Reusable validation schemas for budget
 * Use these in mutation args for consistent validation
 */
export const budgetValidator = {
  total: v.number(), // Must be > 0
  currency: v.string(),
};

// ==================== Business Logic Helpers ====================

/**
 * Validate that task deadline is before event date
 *
 * @param deadline - Task deadline timestamp
 * @param eventDate - Event date timestamp
 * @returns true if deadline is valid (before event date)
 */
export function validateTaskDeadline(deadline: number, eventDate: number): boolean {
  return deadline <= eventDate; // Deadline must be before event
}

/**
 * Validate that budget allocation doesn't exceed total
 *
 * @param allocated - Object mapping categories to allocated amounts
 * @param total - Total budget amount
 * @returns true if allocation is valid (sum <= total)
 */
export function validateBudgetAllocation(
  allocated: Record<string, number>,
  total: number
): boolean {
  const sum = Object.values(allocated).reduce((a, b) => a + b, 0);
  return sum <= total; // Cannot allocate more than total
}

/**
 * Validate that expense amount is positive and finite
 *
 * @param amount - Expense amount
 * @returns true if amount is valid (> 0 and finite)
 */
export function validateExpenseAmount(amount: number): boolean {
  return amount > 0 && Number.isFinite(amount);
}
