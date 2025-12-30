import { CollaborationAgent, Poll, Vote, PollResults } from './CollaborationAgent';
import { Tool, ToolResult } from '../../tools';

/**
 * Test suite for CollaborationAgent
 *
 * This file demonstrates how to use the CollaborationAgent for:
 * - Creating different types of polls
 * - Analyzing poll results
 * - Detecting consensus
 * - Recording decisions
 */

// Mock tool for testing
const mockConvexTool: Tool = {
  name: 'convex_crud',
  description: 'Mock Convex CRUD tool for testing',
  execute: async (params: any): Promise<ToolResult> => {
    console.log('Mock tool called with:', JSON.stringify(params, null, 2));
    return {
      success: true,
      data: { _id: 'test_id_' + Date.now(), ...params.data }
    };
  }
};

describe('CollaborationAgent', () => {
  let agent: CollaborationAgent;

  beforeEach(() => {
    agent = new CollaborationAgent('test-api-key', [mockConvexTool]);
  });

  describe('Poll Analysis', () => {
    test('should analyze simple yes/no poll', () => {
      const poll: Poll = {
        id: 'poll_1',
        title: 'Should we book the venue?',
        type: 'yes_no',
        options: [
          { id: 'yes', text: 'Yes' },
          { id: 'no', text: 'No' }
        ],
        createdBy: 'user_1',
        createdAt: Date.now(),
        status: 'active'
      };

      const votes: Vote[] = [
        { id: 'v1', pollId: 'poll_1', userId: 'u1', userName: 'Alice', choices: ['yes'], timestamp: Date.now() },
        { id: 'v2', pollId: 'poll_1', userId: 'u2', userName: 'Bob', choices: ['yes'], timestamp: Date.now() },
        { id: 'v3', pollId: 'poll_1', userId: 'u3', userName: 'Charlie', choices: ['yes'], timestamp: Date.now() },
        { id: 'v4', pollId: 'poll_1', userId: 'u4', userName: 'David', choices: ['no'], timestamp: Date.now() },
      ];

      const results = agent.analyzePollResults(votes, poll, 4);

      expect(results.totalVotes).toBe(4);
      expect(results.participationRate).toBe(100);
      expect(results.results[0].optionText).toBe('Yes');
      expect(results.results[0].percentage).toBe(75);
      expect(results.consensus?.hasConsensus).toBe(true);
      expect(results.consensus?.consensusLevel).toBe('strong');
    });

    test('should detect no consensus in close vote', () => {
      const poll: Poll = {
        id: 'poll_2',
        title: 'Choose event theme',
        type: 'single_choice',
        options: [
          { id: 'opt1', text: 'Beach Party' },
          { id: 'opt2', text: 'Casino Night' },
          { id: 'opt3', text: 'Garden Party' }
        ],
        createdBy: 'user_1',
        createdAt: Date.now(),
        status: 'active'
      };

      const votes: Vote[] = [
        { id: 'v1', pollId: 'poll_2', userId: 'u1', userName: 'Alice', choices: ['opt1'], timestamp: Date.now() },
        { id: 'v2', pollId: 'poll_2', userId: 'u2', userName: 'Bob', choices: ['opt2'], timestamp: Date.now() },
        { id: 'v3', pollId: 'poll_2', userId: 'u3', userName: 'Charlie', choices: ['opt1'], timestamp: Date.now() },
        { id: 'v4', pollId: 'poll_2', userId: 'u4', userName: 'David', choices: ['opt2'], timestamp: Date.now() },
        { id: 'v5', pollId: 'poll_2', userId: 'u5', userName: 'Eve', choices: ['opt3'], timestamp: Date.now() },
      ];

      const results = agent.analyzePollResults(votes, poll, 10);

      expect(results.totalVotes).toBe(5);
      expect(results.participationRate).toBe(50);
      expect(results.consensus?.consensusLevel).toBe('none');
      expect(results.consensus?.hasConsensus).toBe(false);
    });

    test('should analyze ranked choice poll', () => {
      const poll: Poll = {
        id: 'poll_3',
        title: 'Rank your venue preferences',
        type: 'ranked',
        options: [
          { id: 'venue1', text: 'Grand Hotel' },
          { id: 'venue2', text: 'Conference Center' },
          { id: 'venue3', text: 'Resort' }
        ],
        createdBy: 'user_1',
        createdAt: Date.now(),
        status: 'active'
      };

      const votes: Vote[] = [
        {
          id: 'v1',
          pollId: 'poll_3',
          userId: 'u1',
          userName: 'Alice',
          choices: ['venue1', 'venue2', 'venue3'],
          ranking: { 'venue1': 1, 'venue2': 2, 'venue3': 3 },
          timestamp: Date.now()
        },
        {
          id: 'v2',
          pollId: 'poll_3',
          userId: 'u2',
          userName: 'Bob',
          choices: ['venue1', 'venue3', 'venue2'],
          ranking: { 'venue1': 1, 'venue3': 2, 'venue2': 3 },
          timestamp: Date.now()
        },
        {
          id: 'v3',
          pollId: 'poll_3',
          userId: 'u3',
          userName: 'Charlie',
          choices: ['venue2', 'venue1', 'venue3'],
          ranking: { 'venue2': 1, 'venue1': 2, 'venue3': 3 },
          timestamp: Date.now()
        }
      ];

      const results = agent.analyzePollResults(votes, poll, 3);

      expect(results.rankedResults).toBeDefined();
      expect(results.rankedResults![0].optionText).toBe('Grand Hotel'); // Lowest average rank
      expect(results.rankedResults![0].averageRank).toBeCloseTo(1.33, 1);
    });
  });

  describe('Consensus Detection', () => {
    test('should identify strong consensus', () => {
      const poll: Poll = {
        id: 'poll_4',
        title: 'Approve budget increase',
        type: 'yes_no',
        options: [
          { id: 'yes', text: 'Approve' },
          { id: 'no', text: 'Reject' }
        ],
        createdBy: 'user_1',
        createdAt: Date.now(),
        status: 'active'
      };

      const votes: Vote[] = Array.from({ length: 10 }, (_, i) => ({
        id: `v${i}`,
        pollId: 'poll_4',
        userId: `u${i}`,
        userName: `User${i}`,
        choices: [i < 8 ? 'yes' : 'no'], // 80% yes
        timestamp: Date.now()
      }));

      const results = agent.analyzePollResults(votes, poll, 10);

      expect(results.consensus?.consensusLevel).toBe('strong');
      expect(results.consensus?.hasConsensus).toBe(true);
      expect(results.consensus?.leadingOption).toBe('Approve');
    });

    test('should identify moderate consensus', () => {
      const poll: Poll = {
        id: 'poll_5',
        title: 'Select catering vendor',
        type: 'single_choice',
        options: [
          { id: 'vendor1', text: 'Gourmet Catering Co' },
          { id: 'vendor2', text: 'Budget Eats' },
          { id: 'vendor3', text: 'Local Kitchen' }
        ],
        createdBy: 'user_1',
        createdAt: Date.now(),
        status: 'active'
      };

      const votes: Vote[] = [
        ...Array.from({ length: 6 }, (_, i) => ({
          id: `v${i}`,
          pollId: 'poll_5',
          userId: `u${i}`,
          userName: `User${i}`,
          choices: ['vendor1'],
          timestamp: Date.now()
        })),
        ...Array.from({ length: 3 }, (_, i) => ({
          id: `v${i + 6}`,
          pollId: 'poll_5',
          userId: `u${i + 6}`,
          userName: `User${i + 6}`,
          choices: ['vendor2'],
          timestamp: Date.now()
        })),
        {
          id: 'v9',
          pollId: 'poll_5',
          userId: 'u9',
          userName: 'User9',
          choices: ['vendor3'],
          timestamp: Date.now()
        }
      ];

      const results = agent.analyzePollResults(votes, poll, 10);

      expect(results.consensus?.consensusLevel).toBe('moderate');
      expect(results.consensus?.hasConsensus).toBe(true);
    });
  });

  describe('Vote Summary Generation', () => {
    test('should generate vote summary for decision recording', () => {
      const pollResults: PollResults = {
        pollId: 'poll_6',
        totalVotes: 15,
        results: [
          { optionId: 'opt1', optionText: 'Mountain Resort', voteCount: 12, percentage: 80 },
          { optionId: 'opt2', optionText: 'Beach Hotel', voteCount: 3, percentage: 20 }
        ],
        consensus: {
          hasConsensus: true,
          consensusLevel: 'strong',
          leadingOption: 'Mountain Resort',
          margin: 60,
          notes: ['Strong agreement']
        }
      };

      const summary = agent.generateVoteSummary(pollResults);

      expect(summary).toBeDefined();
      expect(summary!.totalVotes).toBe(15);
      expect(summary!.winningOption).toBe('Mountain Resort');
      expect(summary!.percentage).toBe(80);
    });
  });

  describe('Next Steps Suggestions', () => {
    test('should suggest closing poll when strong consensus reached', () => {
      const poll: Poll = {
        id: 'poll_7',
        title: 'Test Poll',
        type: 'single_choice',
        options: [
          { id: 'opt1', text: 'Option 1' },
          { id: 'opt2', text: 'Option 2' }
        ],
        createdBy: 'user_1',
        createdAt: Date.now(),
        status: 'active'
      };

      const results: PollResults = {
        pollId: 'poll_7',
        totalVotes: 10,
        results: [
          { optionId: 'opt1', optionText: 'Option 1', voteCount: 8, percentage: 80 },
          { optionId: 'opt2', optionText: 'Option 2', voteCount: 2, percentage: 20 }
        ],
        participationRate: 100,
        consensus: {
          hasConsensus: true,
          consensusLevel: 'strong',
          leadingOption: 'Option 1',
          margin: 60,
          notes: ['Strong consensus']
        }
      };

      const suggestions = agent.suggestNextSteps(poll, results);

      expect(suggestions).toContain(
        'Strong consensus reached - consider closing the poll and recording the decision'
      );
    });

    test('should suggest reminders for low participation', () => {
      const poll: Poll = {
        id: 'poll_8',
        title: 'Test Poll',
        type: 'single_choice',
        options: [
          { id: 'opt1', text: 'Option 1' },
          { id: 'opt2', text: 'Option 2' }
        ],
        createdBy: 'user_1',
        createdAt: Date.now(),
        status: 'active'
      };

      const results: PollResults = {
        pollId: 'poll_8',
        totalVotes: 3,
        results: [
          { optionId: 'opt1', optionText: 'Option 1', voteCount: 2, percentage: 67 },
          { optionId: 'opt2', optionText: 'Option 2', voteCount: 1, percentage: 33 }
        ],
        participationRate: 30,
        consensus: {
          hasConsensus: false,
          consensusLevel: 'none',
          margin: 34,
          notes: ['Low participation']
        }
      };

      const suggestions = agent.suggestNextSteps(poll, results);

      expect(suggestions.some(s => s.includes('participation'))).toBe(true);
    });
  });
});

/**
 * Example usage scenarios
 */

// Example 1: Create a simple yes/no poll
const exampleYesNoPoll = {
  operation: 'create',
  table: 'polls',
  data: {
    title: 'Should we book the Grand Hotel for the corporate retreat?',
    description: 'Price: $5000, Capacity: 50 people, Available: March 15-17',
    type: 'yes_no',
    options: [
      { id: 'yes', text: 'Yes, book it' },
      { id: 'no', text: 'No, keep looking' }
    ],
    votingPeriod: {
      startTime: Date.now(),
      endTime: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
    },
    status: 'active',
    createdBy: 'user_123',
    createdAt: Date.now()
  }
};

// Example 2: Create a multi-choice poll
const exampleMultiChoicePoll = {
  operation: 'create',
  table: 'polls',
  data: {
    title: 'Select activities for the retreat (choose up to 3)',
    type: 'multi_choice',
    maxChoices: 3,
    options: [
      { id: 'hiking', text: 'Hiking', description: 'Morning mountain hike' },
      { id: 'yoga', text: 'Yoga Session', description: 'Sunset yoga on the beach' },
      { id: 'cooking', text: 'Cooking Class', description: 'Team cooking competition' },
      { id: 'workshop', text: 'Leadership Workshop', description: '2-hour professional development' },
      { id: 'games', text: 'Team Games', description: 'Outdoor team building games' }
    ],
    status: 'active',
    createdBy: 'user_123',
    createdAt: Date.now()
  }
};

// Example 3: Create a ranked choice poll
const exampleRankedPoll = {
  operation: 'create',
  table: 'polls',
  data: {
    title: 'Rank your preferred dates for the event',
    type: 'ranked',
    options: [
      { id: 'date1', text: 'March 15-17, 2024' },
      { id: 'date2', text: 'March 22-24, 2024' },
      { id: 'date3', text: 'April 5-7, 2024' }
    ],
    status: 'active',
    createdBy: 'user_123',
    createdAt: Date.now()
  }
};

// Example 4: Record a decision
const exampleDecision = {
  operation: 'create',
  table: 'decisions',
  data: {
    title: 'Venue Selection - Q1 Corporate Retreat',
    description: 'Final decision on venue for the March corporate retreat',
    decision: 'Grand Hotel selected as the venue for March 15-17 retreat',
    rationale: 'Strong consensus (80%) in poll. Hotel meets all requirements: capacity, budget, location, and amenities. Early booking discount available.',
    pollId: 'poll_venue_123',
    impact: {
      scope: 'high',
      areas: ['budget', 'logistics', 'accommodations', 'scheduling'],
      stakeholders: ['All Employees', 'HR Team', 'Finance Department', 'Executive Team']
    },
    voteSummary: {
      totalVotes: 25,
      winningOption: 'Grand Hotel',
      percentage: 80
    },
    status: 'approved',
    madeBy: 'user_123',
    madeAt: Date.now()
  }
};
