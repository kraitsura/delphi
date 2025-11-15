# Phase 0.4 Testing - Parallel Execution Guide

## Overview
This directory contains 7 independent testing tracks that can be executed in parallel by multiple agents. Each track is self-contained with complete context, requirements, and acceptance criteria.

## Quick Start

Copy the content of any track file and paste it into a new agent conversation. The agent will have all the context needed to complete that track independently.

---

## Available Tracks

### Track 1: Test Factories ⭐⭐⭐ CRITICAL - START FIRST
**File**: `track1-test-factories.md`
**Priority**: HIGHEST (blocking all other tracks)
**Estimated Time**: 2-3 hours
**Deliverable**: Extended `web/src/test/factories/index.ts` with 10 new factory functions

**Why Start First**: All other tracks depend on these factories for test data generation.

**Dependencies**: None
**Blocks**: All other tracks

---

### Track 2: Agent Context Tests ⭐⭐⭐ HIGH PRIORITY
**File**: `track2-agent-context-tests.md`
**Priority**: HIGH (blocking Phase 2 multi-agent system)
**Estimated Time**: 1-2 hours
**Deliverable**: `web/convex/agentContext.test.ts` with 30-40 test cases

**Why High Priority**: These queries power the Phase 2 agent system. Must verify performance and accuracy.

**Dependencies**: Track 1 (factories)
**Blocks**: Phase 2 implementation

**Critical Tests**:
- `getEventContext` performance < 200ms
- Statistics calculations accuracy
- Large dataset handling

---

### Track 3: Core CRUD Tests - Batch 1 ⭐⭐
**File**: `track3-crud-batch1.md`
**Priority**: MEDIUM
**Estimated Time**: 8-10 hours
**Deliverable**: 4 test files (~1700-2000 lines total)

**Modules**:
1. `vendors.test.ts`
2. `taskGroups.test.ts`
3. `guests.test.ts`
4. `paymentSchedules.test.ts`

**Dependencies**: Track 1 (factories)
**Blocks**: None (independent)

---

### Track 4: Core CRUD Tests - Batch 2 ⭐⭐
**File**: `track4-crud-batch2.md`
**Priority**: MEDIUM
**Estimated Time**: 8-10 hours
**Deliverable**: 4 test files (~1800-2000 lines total)

**Modules**:
1. `milestones.test.ts`
2. `timelineEvents.test.ts`
3. `announcements.test.ts`
4. `inventory.test.ts`

**Dependencies**: Track 1 (factories)
**Blocks**: None (independent)

---

### Track 5: Core CRUD Tests - Batch 3 ⭐⭐
**File**: `track5-crud-batch3.md`
**Priority**: MEDIUM
**Estimated Time**: 8-10 hours
**Deliverable**: 4 test files (~1900-2200 lines total)

**Modules**:
1. `decisions.test.ts`
2. `checkpoints.test.ts`
3. `tasks.test.ts` (enhanced)
4. `expenses.test.ts` (enhanced)

**Dependencies**: Track 1 (factories)
**Blocks**: None (independent)

**Note**: Tasks and expenses are existing files being enhanced, not new files.

---

### Track 6: Validators Tests ⭐
**File**: `track6-validators-tests.md`
**Priority**: LOW-MEDIUM
**Estimated Time**: 1-2 hours
**Deliverable**: `web/convex/validators.test.ts` (~300-400 lines)

**Tests**:
- Validation schema tests (taskValidator, expenseValidator, budgetValidator)
- Business logic function tests (3 functions)
- Integration tests with mutations

**Dependencies**: Track 1 (factories) - optional, can use inline test data
**Blocks**: None (independent)

---

### Track 7: Integration Tests ⭐⭐
**File**: `track7-integration-tests.md`
**Priority**: MEDIUM (should run after most CRUD tests complete)
**Estimated Time**: 4-6 hours
**Deliverable**: `web/convex/integration.test.ts` (~800-1000 lines)

**Tests**:
- Task & Task Group integration
- Expense & Event Budget integration
- Guest & Event Guest Count integration
- Payment Schedule & Expense linking
- Vendor linking across modules
- Task dependencies workflow
- Milestone & Task blocking
- Source message tracking
- Complete event context assembly

**Dependencies**:
- Track 1 (factories)
- Tracks 3-5 (CRUD operations should be implemented)

**Note**: Can start after most CRUD operations are verified working.

---

## Execution Strategies

### Strategy 1: Maximum Parallelization (7 Agents)

**Best for**: Fast completion, large team

```
Agent 1: Track 1 (Factories) - START IMMEDIATELY ⚡
Agent 2: Track 2 (Agent Context) - WAIT for Track 1, then start
Agent 3: Track 3 (CRUD Batch 1) - WAIT for Track 1, then start
Agent 4: Track 4 (CRUD Batch 2) - WAIT for Track 1, then start
Agent 5: Track 5 (CRUD Batch 3) - WAIT for Track 1, then start
Agent 6: Track 6 (Validators) - Can start immediately (optional deps)
Agent 7: Track 7 (Integration) - WAIT for Tracks 3-5, then start
```

**Timeline**:
- Hour 0-3: Track 1 completes
- Hour 3-13: Tracks 2-6 run in parallel
- Hour 13-19: Track 7 completes
- **Total**: ~19 hours (with parallelization)

---

### Strategy 2: Moderate Parallelization (3-4 Agents)

**Best for**: Medium team, balanced approach

**Phase 1**: Foundation (Sequential)
```
Agent 1: Track 1 (Factories) - 3 hours
```

**Phase 2**: High Priority + CRUD Batch 1 (Parallel)
```
Agent 1: Track 2 (Agent Context) - 2 hours
Agent 2: Track 3 (CRUD Batch 1) - 10 hours
Agent 3: Track 6 (Validators) - 2 hours
```

**Phase 3**: CRUD Batches 2-3 (Parallel)
```
Agent 1: Track 4 (CRUD Batch 2) - 10 hours
Agent 2: Track 5 (CRUD Batch 3) - 10 hours
```

**Phase 4**: Integration (Sequential)
```
Agent 1: Track 7 (Integration) - 6 hours
```

**Total**: ~31 hours (with 3 agents, ~10-11 hours real time)

---

### Strategy 3: Sequential (1-2 Agents)

**Best for**: Small team, careful approach

**Order**:
1. Track 1: Factories (3 hours)
2. Track 2: Agent Context (2 hours) ⚡ HIGH PRIORITY
3. Track 6: Validators (2 hours) - Quick win
4. Track 3: CRUD Batch 1 (10 hours)
5. Track 4: CRUD Batch 2 (10 hours)
6. Track 5: CRUD Batch 3 (10 hours)
7. Track 7: Integration (6 hours)

**Total**: ~43 hours

---

## Dependency Graph

```
Track 1 (Factories)
    ├─> Track 2 (Agent Context) ⚡ HIGH PRIORITY
    ├─> Track 3 (CRUD Batch 1)
    ├─> Track 4 (CRUD Batch 2)
    ├─> Track 5 (CRUD Batch 3)
    └─> (Track 6 optional dependency)

Tracks 3, 4, 5 (CRUD Batches)
    └─> Track 7 (Integration)

Track 6 (Validators) - Independent
```

---

## How to Use Each Track

### For Each Track:

1. **Open the track file** (e.g., `track3-crud-batch1.md`)
2. **Copy the entire content**
3. **Start a new agent conversation**
4. **Paste the content as the initial prompt**
5. **Let the agent work autonomously**
6. **Review deliverables when complete**

### Important Notes:

- ✅ Each track is **fully self-contained**
- ✅ All necessary **context is included**
- ✅ **Acceptance criteria** clearly defined
- ✅ **Test patterns** and examples provided
- ✅ **Schema references** included
- ✅ No cross-track communication needed

---

## Success Criteria (Overall)

### Phase 0.4 Complete When:

- ✅ All 7 tracks completed
- ✅ All test files created and passing
- ✅ Code coverage ≥ 80% on all CRUD files
- ✅ Code coverage ≥ 90% on agentContext.ts
- ✅ Code coverage ≥ 95% on validators.ts
- ✅ Performance benchmarks met (getEventContext < 200ms)
- ✅ No TypeScript errors
- ✅ Integration tests verify cross-entity relationships
- ✅ `npm run test` passes all tests
- ✅ `npm run test:coverage` shows 80%+ coverage

---

## Progress Tracking

### Track 1: Test Factories
- [ ] Factories file updated
- [ ] All 10 new factories added
- [ ] All factories tested and working
- [ ] No TypeScript errors

### Track 2: Agent Context Tests
- [ ] agentContext.test.ts created
- [ ] All 3 query test suites complete
- [ ] Performance benchmarks passing
- [ ] All tests passing

### Track 3: CRUD Batch 1
- [ ] vendors.test.ts complete
- [ ] taskGroups.test.ts complete
- [ ] guests.test.ts complete
- [ ] paymentSchedules.test.ts complete
- [ ] All tests passing

### Track 4: CRUD Batch 2
- [ ] milestones.test.ts complete
- [ ] timelineEvents.test.ts complete
- [ ] announcements.test.ts complete
- [ ] inventory.test.ts complete
- [ ] All tests passing

### Track 5: CRUD Batch 3
- [ ] decisions.test.ts complete
- [ ] checkpoints.test.ts complete
- [ ] tasks.test.ts enhanced
- [ ] expenses.test.ts enhanced
- [ ] All tests passing

### Track 6: Validators Tests
- [ ] validators.test.ts complete
- [ ] All validators tested
- [ ] Business logic functions tested
- [ ] All tests passing

### Track 7: Integration Tests
- [ ] integration.test.ts complete
- [ ] All 9 integration categories tested
- [ ] All tests passing
- [ ] Cross-entity relationships verified

---

## Final Verification

After all tracks complete, run:

```bash
# Run all tests
npm run test

# Check coverage
npm run test:coverage

# Interactive testing (optional)
npm run test:ui

# Watch mode (during development)
npm run test:watch
```

Expected output:
```
✓ All test suites passed
✓ Coverage: 80%+ on all CRUD files
✓ Coverage: 90%+ on agentContext.ts
✓ Coverage: 95%+ on validators.ts
✓ 0 TypeScript errors
✓ Performance benchmarks met
```

---

## Estimated Totals

| Track | Time | Lines of Code | Test Cases |
|-------|------|---------------|------------|
| Track 1 | 2-3h | ~200 lines | 10 factories |
| Track 2 | 1-2h | ~600 lines | 30-40 tests |
| Track 3 | 8-10h | ~1800 lines | 160-240 tests |
| Track 4 | 8-10h | ~1900 lines | 160-240 tests |
| Track 5 | 8-10h | ~2000 lines | 160-240 tests |
| Track 6 | 1-2h | ~350 lines | 40-50 tests |
| Track 7 | 4-6h | ~900 lines | 40-50 tests |
| **TOTAL** | **32-43h** | **~7750 lines** | **590-860 tests** |

**With Maximum Parallelization**: ~19 hours real time (7 agents)
**With Moderate Parallelization**: ~10-11 hours real time (3-4 agents)

---

## Questions & Issues

If you encounter issues:
1. Check dependency graph (did Track 1 complete first?)
2. Verify all factories are available and working
3. Check for TypeScript errors (`bunx tsc --noEmit`)
4. Run tests individually to isolate failures
5. Review acceptance criteria in each track

---

## Next Steps After Phase 0.4

Once all testing tracks are complete:

1. ✅ **Update progress document** with test results
2. ✅ **Generate coverage reports** and save for baseline
3. ✅ **Document any issues found** during testing
4. ✅ **Mark Phase 0 as COMPLETE** in progress tracking
5. ✅ **Begin Phase 1**: Frontend Integration
6. ✅ **Begin Phase 2**: Multi-Agent System (unblocked!)

---

**Last Updated**: November 14, 2025
**Status**: Ready for parallel execution
**Tracks Available**: 7
**Total Test Coverage Goal**: 80%+ across all modules
