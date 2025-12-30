import { BaseAgent, AgentContext, AgentResponse } from '../BaseAgent';
import { Tool } from '../../tools';

/**
 * Poll Types
 */
export type PollType = 'single_choice' | 'multi_choice' | 'ranked' | 'yes_no';

export interface PollOption {
  id: string;
  text: string;
  description?: string;
}

export interface Poll {
  id: string;
  title: string;
  description?: string;
  type: PollType;
  options: PollOption[];
  votingPeriod?: {
    startTime: number;
    endTime: number;
  };
  allowedVoters?: string[]; // User IDs, undefined means all room members
  minVotes?: number;
  maxChoices?: number; // For multi_choice polls
  createdBy: string;
  createdAt: number;
  status: 'draft' | 'active' | 'closed' | 'cancelled';
}

export interface Vote {
  id: string;
  pollId: string;
  userId: string;
  userName: string;
  choices: string[]; // Option IDs
  ranking?: Record<string, number>; // For ranked polls: optionId -> rank
  timestamp: number;
}

export interface PollResults {
  pollId: string;
  totalVotes: number;
  results: {
    optionId: string;
    optionText: string;
    voteCount: number;
    percentage: number;
    voters?: string[]; // User names who voted for this option
  }[];
  rankedResults?: {
    optionId: string;
    optionText: string;
    averageRank: number;
    rankDistribution: Record<number, number>; // rank -> count
  }[];
  participationRate?: number; // If allowedVoters is defined
  consensus?: ConsensusAnalysis;
}

export interface ConsensusAnalysis {
  hasConsensus: boolean;
  consensusLevel: 'strong' | 'moderate' | 'weak' | 'none';
  leadingOption?: string;
  margin?: number; // Percentage points between top 2 options
  notes: string[];
}

export interface Decision {
  id: string;
  title: string;
  description: string;
  pollId?: string; // Reference to poll that led to this decision
  decision: string; // The actual decision made
  rationale: string;
  impact: {
    scope: 'high' | 'medium' | 'low';
    areas: string[]; // e.g., ['budget', 'timeline', 'vendor']
    stakeholders: string[];
  };
  madeBy: string;
  madeAt: number;
  voteSummary?: {
    totalVotes: number;
    winningOption: string;
    percentage: number;
  };
  status: 'proposed' | 'approved' | 'implemented' | 'rejected';
}

/**
 * CollaborationAgent - Specialized agent for group decision-making and polls
 *
 * Capabilities:
 * - Poll creation (single/multi choice, ranked, yes/no)
 * - Poll analysis (summarize results, detect consensus)
 * - Decision recording (document decisions with impact)
 * - Voting facilitation (manage voting periods)
 * - Consensus detection
 *
 * Use cases:
 * - "Create a poll to choose between vendor A and vendor B"
 * - "What's the current vote count on the venue poll?"
 * - "Has consensus been reached on the date selection?"
 * - "Record the decision to go with Vendor X for catering"
 * - "Show me all decisions made this week"
 */
export class CollaborationAgent extends BaseAgent {
  constructor(aiKey: string, tools: Tool[]) {
    super('CollaborationAgent', aiKey, tools);
  }

  getIntent(): string {
    return 'collaboration';
  }

  getSystemPrompt(context: AgentContext): string {
    const baseContext = this.buildBaseContext(context);

    return `You are Delphi's Collaboration Facilitator, focused on group decision-making.

${baseContext}

Your capabilities:
- Create polls (single choice, multiple choice, ranked, yes/no, rating)
- Analyze voting results and detect consensus or division
- Record decisions with their impacts (budget, timeline, vendors)
- Suggest compromises when opinions are divided
- Set voting deadlines and send reminders

Decision facilitation:
- Frame questions clearly and neutrally
- Include pros/cons for each option when relevant
- Note cost implications for choices
- Record rationale for decisions

DO NOT:
- Create tasks or expenses
- Search for vendors
- Manage milestones
- Provide advice unrelated to decisions

CORE CAPABILITIES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. POLL CREATION
   - Single choice: One option per voter
   - Multi choice: Multiple selections allowed
   - Ranked choice: Voters rank options by preference
   - Yes/No: Simple binary decision

   Poll features:
   - Time-bound voting periods
   - Restricted voter lists (optional)
   - Minimum vote thresholds
   - Anonymous or attributed voting

2. POLL ANALYSIS
   - Real-time vote counting
   - Consensus detection (strong/moderate/weak/none)
   - Participation rate tracking
   - Result visualization data
   - Winning option identification

3. DECISION RECORDING
   - Document final decisions
   - Track decision rationale
   - Assess impact scope (high/medium/low)
   - Identify affected stakeholders
   - Link to supporting polls
   - Status tracking (proposed/approved/implemented/rejected)

4. VOTING FACILITATION
   - Open/close voting periods
   - Send voting reminders
   - Track participation
   - Validate votes
   - Detect vote changes

5. CONSENSUS DETECTION
   - Strong consensus: >70% agreement, <10% margin
   - Moderate consensus: >60% agreement, <20% margin
   - Weak consensus: >50% agreement, <30% margin
   - No consensus: Split decision or low participation

INTERACTION PATTERNS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Poll Creation Patterns:
- "Create a poll to choose between [options]"
- "Let's vote on [decision]"
- "Poll the group about [topic]"
- "Set up a ranked choice vote for [options]"

Poll Analysis Patterns:
- "What are the poll results for [poll]?"
- "Has consensus been reached on [topic]?"
- "How many people have voted on [poll]?"
- "Show me the current standings"

Decision Recording Patterns:
- "Record the decision to [action]"
- "Document that we decided on [choice]"
- "Save this decision: [decision]"
- "Log the group's choice of [option]"

Voting Facilitation Patterns:
- "Close the voting on [poll]"
- "Extend voting deadline to [date]"
- "Who hasn't voted yet on [poll]?"
- "Remind everyone to vote on [poll]"

DECISION QUALITY GUIDELINES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When creating polls:
1. Ensure options are clear and mutually exclusive
2. Set appropriate voting periods (not too short)
3. Consider who should vote (all members vs. stakeholders)
4. Choose poll type based on decision complexity
5. Include context/description for clarity

When analyzing results:
1. Consider participation rate (low turnout = weak decision)
2. Look for split decisions (may need discussion)
3. Identify strong consensus early (can close poll)
4. Note any ties or very close races
5. Consider voter demographics (stakeholder vs. general)

When recording decisions:
1. Capture the "why" not just the "what"
2. Document impact on budget, timeline, scope
3. Identify who needs to implement
4. Link to supporting data (polls, discussions)
5. Set status appropriately

TOOL USAGE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use convex_crud to:
- Create polls: table="polls", operation="create"
- Record votes: table="votes", operation="create"
- Query poll results: table="votes", operation="query" with filters
- Store decisions: table="decisions", operation="create"
- Update poll status: table="polls", operation="update"
- List active polls: table="polls", operation="list"

Example poll creation:
{
  "operation": "create",
  "table": "polls",
  "data": {
    "title": "Choose venue for corporate retreat",
    "type": "single_choice",
    "options": [
      {"id": "opt1", "text": "Mountain Resort", "description": "$5k, sleeps 50"},
      {"id": "opt2", "text": "Beach Hotel", "description": "$4k, sleeps 40"}
    ],
    "votingPeriod": {
      "startTime": 1234567890,
      "endTime": 1234654290
    },
    "status": "active"
  }
}

Example vote recording:
{
  "operation": "create",
  "table": "votes",
  "data": {
    "pollId": "poll_123",
    "userId": "user_456",
    "userName": "John Doe",
    "choices": ["opt1"],
    "timestamp": 1234567890
  }
}

Example decision recording:
{
  "operation": "create",
  "table": "decisions",
  "data": {
    "title": "Venue Selection - Corporate Retreat",
    "decision": "Mountain Resort selected as venue",
    "rationale": "Strong consensus (75%) in favor due to capacity and amenities",
    "pollId": "poll_123",
    "impact": {
      "scope": "high",
      "areas": ["budget", "logistics", "accommodations"],
      "stakeholders": ["HR Team", "Finance", "All Attendees"]
    },
    "voteSummary": {
      "totalVotes": 20,
      "winningOption": "Mountain Resort",
      "percentage": 75
    },
    "status": "approved"
  }
}

CONSENSUS DETECTION ALGORITHM:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Calculate winning percentage
2. Calculate margin between top 2 options
3. Assess participation rate
4. Determine consensus level:
   - Strong: >70% for winner AND margin >60 points AND participation >50%
   - Moderate: >60% for winner AND margin >40 points AND participation >40%
   - Weak: >50% for winner AND margin >20 points AND participation >30%
   - None: Otherwise

5. Generate notes about the consensus:
   - Low participation warnings
   - Close race warnings
   - Strong agreement confirmations
   - Recommendations for next steps

RESPONSE STYLE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Be collaborative and facilitating:
- "Let's see what the group thinks..."
- "Based on the votes so far..."
- "We have strong consensus on..."
- "The group is split between..."
- "Let's document this decision for the team..."

Provide clear summaries:
- Show vote counts and percentages
- Highlight consensus or lack thereof
- Suggest next steps (close poll, extend voting, discuss further)
- Make decision recording concrete and actionable

Stay neutral on outcomes:
- Present results objectively
- Don't advocate for specific options
- Highlight all perspectives
- Ensure fair process

CURRENT CONTEXT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Room: ${context.roomId}
${context.eventId ? `Event: ${context.eventId}` : ''}
${context.autoContext ? `User: ${context.autoContext.userInfo.name}` : ''}

Remember: Your role is to facilitate group decisions, not make them. Always ensure fair process, clear communication, and proper documentation.`;
  }

  /**
   * Build base context information
   */
  private buildBaseContext(context: AgentContext): string {
    const parts: string[] = [];

    if (context.scope) {
      parts.push(`Scope: ${context.scope}`);
    }

    if (context.roomSummaries && context.roomSummaries.length > 0) {
      const roomTypes = context.roomSummaries.map(r => r.roomType).join(', ');
      parts.push(`Available rooms: ${roomTypes}`);
    }

    if (context.eventStats) {
      parts.push(`Event has ${context.eventStats.totalRooms} rooms, ${context.eventStats.taskCount} tasks`);
    }

    return parts.length > 0 ? parts.join('\n') : 'Operating in current room context';
  }

  /**
   * Override buildComponentResponse to provide poll/decision UI components
   */
  protected buildComponentResponse(
    intent: string,
    data: any,
    context: AgentContext
  ): Partial<AgentResponse> {
    const intentLower = intent.toLowerCase();

    // Poll results visualization
    if (intentLower.includes('poll_results') || intentLower.includes('show_poll')) {
      return {
        renderType: 'component_grid',
        componentConfig: {
          sections: [
            {
              type: 'grid',
              components: [
                {
                  type: 'PollResults',
                  props: {
                    pollId: data?.pollId,
                    eventId: context.eventId,
                    roomId: context.roomId,
                    showVoters: true,
                    showConsensus: true
                  }
                }
              ]
            }
          ]
        }
      };
    }

    // Active polls list
    if (intentLower.includes('list_polls') || intentLower.includes('show_polls')) {
      return {
        renderType: 'component_grid',
        componentConfig: {
          sections: [
            {
              type: 'grid',
              components: [
                {
                  type: 'PollList',
                  props: {
                    eventId: context.eventId,
                    roomId: context.roomId,
                    status: 'active',
                    showParticipation: true
                  }
                }
              ]
            }
          ]
        }
      };
    }

    // Decision log
    if (intentLower.includes('show_decisions') || intentLower.includes('decision_log')) {
      return {
        renderType: 'component_grid',
        componentConfig: {
          sections: [
            {
              type: 'grid',
              components: [
                {
                  type: 'DecisionLog',
                  props: {
                    eventId: context.eventId,
                    roomId: context.roomId,
                    showImpact: true,
                    groupByStatus: true
                  }
                }
              ]
            }
          ]
        }
      };
    }

    // Interactive poll voting
    if (intentLower.includes('vote') || intentLower.includes('create_poll')) {
      return {
        renderType: 'interactive_prompt',
        interactivePrompt: {
          promptType: 'poll',
          data: {
            poll: data,
            allowVoting: true,
            showResults: data?.status === 'closed'
          }
        }
      };
    }

    return {};
  }

  /**
   * Analyze poll results and detect consensus
   */
  analyzePollResults(votes: Vote[], poll: Poll, totalEligibleVoters?: number): PollResults {
    const totalVotes = votes.length;
    const participationRate = totalEligibleVoters
      ? (totalVotes / totalEligibleVoters) * 100
      : undefined;

    // Count votes per option
    const voteCounts = new Map<string, { count: number; voters: string[] }>();
    poll.options.forEach(opt => {
      voteCounts.set(opt.id, { count: 0, voters: [] });
    });

    votes.forEach(vote => {
      vote.choices.forEach(choiceId => {
        const current = voteCounts.get(choiceId);
        if (current) {
          current.count++;
          current.voters.push(vote.userName);
        }
      });
    });

    // Build results array
    const results = poll.options.map(opt => {
      const voteData = voteCounts.get(opt.id) || { count: 0, voters: [] };
      return {
        optionId: opt.id,
        optionText: opt.text,
        voteCount: voteData.count,
        percentage: totalVotes > 0 ? (voteData.count / totalVotes) * 100 : 0,
        voters: voteData.voters
      };
    }).sort((a, b) => b.voteCount - a.voteCount);

    // Analyze ranked choice if applicable
    let rankedResults: PollResults['rankedResults'];
    if (poll.type === 'ranked') {
      rankedResults = this.analyzeRankedChoice(votes, poll);
    }

    // Detect consensus
    const consensus = this.detectConsensus(results, totalVotes, participationRate);

    return {
      pollId: poll.id,
      totalVotes,
      results,
      rankedResults,
      participationRate,
      consensus
    };
  }

  /**
   * Analyze ranked choice voting
   */
  private analyzeRankedChoice(votes: Vote[], poll: Poll): PollResults['rankedResults'] {
    const rankTotals = new Map<string, { totalRank: number; count: number; distribution: Record<number, number> }>();

    poll.options.forEach(opt => {
      rankTotals.set(opt.id, { totalRank: 0, count: 0, distribution: {} });
    });

    votes.forEach(vote => {
      if (vote.ranking) {
        Object.entries(vote.ranking).forEach(([optionId, rank]) => {
          const data = rankTotals.get(optionId);
          if (data) {
            data.totalRank += rank;
            data.count++;
            data.distribution[rank] = (data.distribution[rank] || 0) + 1;
          }
        });
      }
    });

    return poll.options.map(opt => {
      const data = rankTotals.get(opt.id) || { totalRank: 0, count: 0, distribution: {} };
      return {
        optionId: opt.id,
        optionText: opt.text,
        averageRank: data.count > 0 ? data.totalRank / data.count : 999,
        rankDistribution: data.distribution
      };
    }).sort((a, b) => a.averageRank - b.averageRank);
  }

  /**
   * Detect consensus based on voting results
   */
  private detectConsensus(
    results: PollResults['results'],
    totalVotes: number,
    participationRate?: number
  ): ConsensusAnalysis {
    if (results.length === 0 || totalVotes === 0) {
      return {
        hasConsensus: false,
        consensusLevel: 'none',
        notes: ['No votes cast yet']
      };
    }

    const topOption = results[0];
    const secondOption = results[1];
    const margin = secondOption ? topOption.percentage - secondOption.percentage : topOption.percentage;
    const participation = participationRate || 100; // Assume 100% if not specified

    const notes: string[] = [];

    // Check participation
    if (participationRate !== undefined && participationRate < 30) {
      notes.push(`Low participation rate (${participationRate.toFixed(1)}%)`);
    }

    // Determine consensus level
    let consensusLevel: ConsensusAnalysis['consensusLevel'];
    let hasConsensus = false;

    if (topOption.percentage > 70 && margin > 60 && participation > 50) {
      consensusLevel = 'strong';
      hasConsensus = true;
      notes.push(`Strong agreement on "${topOption.optionText}" (${topOption.percentage.toFixed(1)}%)`);
    } else if (topOption.percentage > 60 && margin > 40 && participation > 40) {
      consensusLevel = 'moderate';
      hasConsensus = true;
      notes.push(`Moderate consensus for "${topOption.optionText}" (${topOption.percentage.toFixed(1)}%)`);
    } else if (topOption.percentage > 50 && margin > 20 && participation > 30) {
      consensusLevel = 'weak';
      hasConsensus = true;
      notes.push(`Weak consensus - "${topOption.optionText}" leads with ${topOption.percentage.toFixed(1)}%`);
    } else {
      consensusLevel = 'none';
      hasConsensus = false;
      if (margin < 10) {
        notes.push(`Very close race - top two options separated by only ${margin.toFixed(1)} percentage points`);
      } else if (topOption.percentage < 50) {
        notes.push(`No majority - leading option has only ${topOption.percentage.toFixed(1)}% support`);
      } else {
        notes.push(`Decision is split - may need further discussion`);
      }
    }

    // Check for ties
    if (secondOption && Math.abs(topOption.voteCount - secondOption.voteCount) === 0) {
      notes.push('Tie detected - additional votes or discussion needed');
    }

    return {
      hasConsensus,
      consensusLevel,
      leadingOption: topOption.optionText,
      margin,
      notes
    };
  }

  /**
   * Generate voting summary for decision recording
   */
  generateVoteSummary(pollResults: PollResults): Decision['voteSummary'] {
    if (pollResults.results.length === 0) {
      return undefined;
    }

    const winner = pollResults.results[0];
    return {
      totalVotes: pollResults.totalVotes,
      winningOption: winner.optionText,
      percentage: winner.percentage
    };
  }

  /**
   * Suggest next steps based on poll status and results
   */
  suggestNextSteps(poll: Poll, results: PollResults): string[] {
    const suggestions: string[] = [];

    if (poll.status === 'active') {
      // Check if consensus is reached
      if (results.consensus?.hasConsensus && results.consensus.consensusLevel === 'strong') {
        suggestions.push('Strong consensus reached - consider closing the poll and recording the decision');
      } else if (results.totalVotes === 0) {
        suggestions.push('No votes yet - send reminders to participants');
      } else if (results.participationRate && results.participationRate < 50) {
        suggestions.push('Low participation - consider extending the voting period or sending reminders');
      } else if (results.consensus?.consensusLevel === 'none') {
        suggestions.push('No consensus - may need group discussion before making a decision');
      }

      // Check voting period
      if (poll.votingPeriod) {
        const now = Date.now();
        const timeLeft = poll.votingPeriod.endTime - now;
        const hoursLeft = timeLeft / (1000 * 60 * 60);

        if (hoursLeft < 0) {
          suggestions.push('Voting period has ended - close the poll and tally results');
        } else if (hoursLeft < 24) {
          suggestions.push(`Voting closes in ${Math.round(hoursLeft)} hours - send final reminder`);
        }
      }
    } else if (poll.status === 'closed') {
      if (results.consensus?.hasConsensus) {
        suggestions.push('Record the final decision with full context');
      } else {
        suggestions.push('Poll closed without consensus - schedule discussion or create new poll');
      }
    }

    return suggestions;
  }
}
