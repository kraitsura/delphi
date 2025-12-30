/**
 * Test suite for KeywordHeuristics
 * Validates keyword-based intent scoring
 */

import { KeywordHeuristics, HeuristicScore } from './KeywordHeuristics';

describe('KeywordHeuristics', () => {
  let heuristics: KeywordHeuristics;

  beforeEach(() => {
    heuristics = new KeywordHeuristics();
  });

  describe('analyze', () => {
    it('should detect task creation intent', () => {
      const results = heuristics.analyze('create a task for photography');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].intent).toBe('task_create');
      expect(results[0].score).toBeGreaterThan(0.5);
      expect(results[0].keywords).toContain('create');
      expect(results[0].keywords).toContain('task');
    });

    it('should detect budget query intent', () => {
      const results = heuristics.analyze('show me the budget');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].intent).toBe('query_budget');
      expect(results[0].keywords).toContain('show');
      expect(results[0].keywords).toContain('budget');
    });

    it('should detect vendor search intent', () => {
      const results = heuristics.analyze('find photographers in bay area');

      expect(results.length).toBeGreaterThan(0);
      const topIntents = results.map(r => r.intent);
      expect(topIntents).toContain('search_vendors');
      expect(results.find(r => r.intent === 'search_vendors')?.keywords).toContain('find');
    });

    it('should handle multiple intent signals', () => {
      const results = heuristics.analyze('add expense for DJ and update tasks');

      expect(results.length).toBeGreaterThan(1);
      const intents = results.map(r => r.intent);
      expect(intents).toContain('add_expense');
      expect(intents).toContain('task_update');
    });

    it('should cap scores at 0.85', () => {
      const results = heuristics.analyze('task todo deadline assign priority urgent important checklist');

      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        expect(result.score).toBeLessThanOrEqual(0.85);
      });
    });

    it('should return empty array for no keyword matches', () => {
      const results = heuristics.analyze('hello there');

      expect(results).toEqual([]);
    });

    it('should handle punctuation correctly', () => {
      const results = heuristics.analyze('Create task, update budget!');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.keywords.includes('create'))).toBe(true);
      expect(results.some(r => r.keywords.includes('update'))).toBe(true);
    });

    it('should be case insensitive', () => {
      const results1 = heuristics.analyze('CREATE TASK');
      const results2 = heuristics.analyze('create task');

      expect(results1).toEqual(results2);
    });

    it('should remove duplicate keywords', () => {
      const results = heuristics.analyze('task task task');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].keywords).toEqual(['task']);
    });
  });

  describe('getTopIntent', () => {
    it('should return top scoring intent', () => {
      const top = heuristics.getTopIntent('create a new task');

      expect(top).not.toBeNull();
      expect(top?.intent).toBe('task_create');
    });

    it('should return null for no matches', () => {
      const top = heuristics.getTopIntent('random words');

      expect(top).toBeNull();
    });
  });

  describe('hasKeywordsFor', () => {
    it('should return true when keywords match intent', () => {
      const hasKeywords = heuristics.hasKeywordsFor('create task', 'task_create');

      expect(hasKeywords).toBe(true);
    });

    it('should return false when keywords do not match intent', () => {
      const hasKeywords = heuristics.hasKeywordsFor('show budget', 'task_create');

      expect(hasKeywords).toBe(false);
    });
  });

  describe('getCoverageScore', () => {
    it('should return 1.0 for full keyword coverage', () => {
      const coverage = heuristics.getCoverageScore('create task budget');

      expect(coverage).toBe(1.0);
    });

    it('should return 0.5 for half keyword coverage', () => {
      const coverage = heuristics.getCoverageScore('create random');

      expect(coverage).toBe(0.5);
    });

    it('should return 0 for no keyword coverage', () => {
      const coverage = heuristics.getCoverageScore('random words only');

      expect(coverage).toBe(0);
    });

    it('should return 0 for empty string', () => {
      const coverage = heuristics.getCoverageScore('');

      expect(coverage).toBe(0);
    });
  });

  describe('comprehensive keyword coverage', () => {
    const testCases = [
      // Task keywords
      { message: 'add a todo with deadline', expectedIntent: 'task_create' },
      { message: 'show me all tasks', expectedIntent: 'query_tasks' },
      { message: 'update task priority', expectedIntent: 'task_update' },
      { message: 'delete completed tasks', expectedIntent: 'delete_task' },
      { message: 'sync tasks from conversation', expectedIntent: 'sync_conversation_to_tasks' },

      // Budget keywords
      { message: 'create budget for wedding', expectedIntent: 'create_budget' },
      { message: 'add expense for catering', expectedIntent: 'add_expense' },
      { message: 'show total costs', expectedIntent: 'query_budget' },
      { message: 'update budget allocation', expectedIntent: 'update_budget' },

      // Vendor keywords
      { message: 'search for photographers', expectedIntent: 'search_vendors' },
      { message: 'find caterer in SF', expectedIntent: 'search_vendors' },
      { message: 'save this vendor', expectedIntent: 'save_vendor' },
      { message: 'list all vendors', expectedIntent: 'query_vendors' },

      // Planning keywords
      { message: 'help me plan the event', expectedIntent: 'general_planning' },
      { message: 'create a poll for venue', expectedIntent: 'create_poll' },
    ];

    testCases.forEach(({ message, expectedIntent }) => {
      it(`should detect ${expectedIntent} from "${message}"`, () => {
        const results = heuristics.analyze(message);
        const intents = results.map(r => r.intent);

        expect(intents).toContain(expectedIntent);
      });
    });
  });

  describe('performance', () => {
    it('should analyze message in under 10ms', () => {
      const message = 'create tasks for photographer caterer dj venue florist and show budget with expenses';
      const iterations = 1000;

      const start = Date.now();
      for (let i = 0; i < iterations; i++) {
        heuristics.analyze(message);
      }
      const end = Date.now();

      const avgTime = (end - start) / iterations;
      expect(avgTime).toBeLessThan(10);
    });
  });
});
