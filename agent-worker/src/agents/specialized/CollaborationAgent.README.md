# CollaborationAgent

A specialized AI agent for group decision-making, polls, and consensus building in event planning contexts.

## Overview

The CollaborationAgent facilitates democratic decision-making processes within event planning teams. It creates and manages polls, analyzes voting results, detects consensus, and records decisions with full context and impact assessment.

## Features

### 1. Poll Creation

Create different types of polls based on the decision complexity:

- **Yes/No Polls**: Simple binary decisions
- **Single Choice**: Select one option from multiple choices
- **Multi Choice**: Select multiple options (configurable limit)
- **Ranked Choice**: Rank options by preference

### 2. Poll Analysis

- Real-time vote counting and percentage calculation
- Participation rate tracking
- Voter attribution (who voted for what)
- Result visualization data generation

### 3. Consensus Detection

Automatically detects and classifies consensus:

- **Strong Consensus**: >70% agreement, >60 point margin, >50% participation
- **Moderate Consensus**: >60% agreement, >40 point margin, >40% participation
- **Weak Consensus**: >50% agreement, >20 point margin, >30% participation
- **No Consensus**: Split decision or below thresholds

### 4. Decision Recording

Document decisions with rich context:

- Decision title and description
- Rationale and supporting data
- Impact assessment (scope: high/medium/low)
- Affected areas and stakeholders
- Link to supporting polls
- Status tracking (proposed/approved/implemented/rejected)

### 5. Voting Facilitation

- Time-bound voting periods
- Restricted voter lists (optional)
- Participation tracking
- Voting reminders
- Status management (open/close polls)

## Usage Examples

### Create a Poll

```typescript
// User: "Create a poll to choose between the Grand Hotel and Beach Resort for our retreat"

const agent = new CollaborationAgent(apiKey, tools);
const response = await agent.handle({
  message: "Create a poll to choose between the Grand Hotel and Beach Resort for our retreat",
  roomId: "room_123",
  eventId: "event_456",
  recentMessages: []
});

// Agent will use convex_crud tool to create:
{
  operation: "create",
  table: "polls",
  data: {
    title: "Choose retreat venue",
    type: "single_choice",
    options: [
      { id: "hotel", text: "Grand Hotel", description: "$5k, sleeps 50" },
      { id: "resort", text: "Beach Resort", description: "$4k, sleeps 40" }
    ],
    status: "active",
    votingPeriod: {
      startTime: Date.now(),
      endTime: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
    }
  }
}
```

### Analyze Poll Results

```typescript
// User: "What are the results of the venue poll?"

const response = await agent.handle({
  message: "What are the results of the venue poll?",
  roomId: "room_123",
  eventId: "event_456",
  recentMessages: []
});

// Agent will:
// 1. Query votes for the poll
// 2. Calculate results and percentages
// 3. Detect consensus
// 4. Return formatted results with UI components
```

### Record a Decision

```typescript
// User: "Record the decision to go with the Grand Hotel based on the poll"

const response = await agent.handle({
  message: "Record the decision to go with the Grand Hotel based on the poll",
  roomId: "room_123",
  eventId: "event_456",
  recentMessages: []
});

// Agent will create a decision record with:
// - Poll results summary
// - Consensus analysis
// - Impact assessment
// - Affected stakeholders
```

## Poll Types

### Yes/No Poll

```typescript
{
  type: "yes_no",
  options: [
    { id: "yes", text: "Yes, approve" },
    { id: "no", text: "No, reject" }
  ]
}
```

### Single Choice Poll

```typescript
{
  type: "single_choice",
  options: [
    { id: "opt1", text: "Option 1", description: "Details..." },
    { id: "opt2", text: "Option 2", description: "Details..." },
    { id: "opt3", text: "Option 3", description: "Details..." }
  ]
}
```

### Multi Choice Poll

```typescript
{
  type: "multi_choice",
  maxChoices: 3,
  options: [
    { id: "hiking", text: "Hiking" },
    { id: "yoga", text: "Yoga Session" },
    { id: "cooking", text: "Cooking Class" },
    { id: "workshop", text: "Leadership Workshop" },
    { id: "games", text: "Team Games" }
  ]
}
```

### Ranked Choice Poll

```typescript
{
  type: "ranked",
  options: [
    { id: "date1", text: "March 15-17" },
    { id: "date2", text: "March 22-24" },
    { id: "date3", text: "April 5-7" }
  ]
}
```

## Consensus Detection Algorithm

The agent uses a sophisticated algorithm to detect consensus:

1. **Calculate winning percentage**: votes for top option / total votes
2. **Calculate margin**: difference between top 2 options
3. **Assess participation**: votes cast / eligible voters
4. **Determine level**:
   - Strong: >70% winner, >60pt margin, >50% participation
   - Moderate: >60% winner, >40pt margin, >40% participation
   - Weak: >50% winner, >20pt margin, >30% participation
   - None: Below thresholds

5. **Generate insights**:
   - Low participation warnings
   - Close race notifications
   - Tie detection
   - Consensus confirmations
   - Recommended next steps

## Decision Impact Assessment

When recording decisions, the agent assesses impact across multiple dimensions:

### Scope Levels

- **High**: Major decisions affecting budget, timeline, or key stakeholders
- **Medium**: Moderate impact on specific areas or groups
- **Low**: Minor decisions with limited scope

### Impact Areas

Common areas tracked:
- `budget`: Financial implications
- `timeline`: Schedule impact
- `vendor`: Vendor relationships
- `logistics`: Operational changes
- `accommodations`: Space/venue changes
- `activities`: Program modifications
- `staffing`: Personnel requirements

### Stakeholders

The agent identifies affected parties:
- Teams (HR, Finance, Operations, etc.)
- Roles (Attendees, Speakers, Organizers, etc.)
- Vendors and external partners
- Budget holders and decision makers

## Response Types

The agent provides rich, interactive responses:

### Text Response

Plain text summary of poll status, results, or decisions.

### Component Grid

Visual UI components for:
- `PollResults`: Interactive results display
- `PollList`: List of active polls
- `DecisionLog`: Historical decision records

### Interactive Prompts

Voting interface:
- Display poll options
- Capture user votes
- Show real-time results (if poll is closed)

## Next Steps Suggestions

The agent proactively suggests next steps based on poll status:

- **Strong consensus reached**: "Consider closing poll and recording decision"
- **No votes yet**: "Send reminders to participants"
- **Low participation**: "Extend voting period or send reminders"
- **No consensus**: "May need group discussion before deciding"
- **Voting ending soon**: "Send final reminder (X hours left)"
- **Poll closed without consensus**: "Schedule discussion or create new poll"

## Integration with Other Agents

The CollaborationAgent works alongside other specialized agents:

- **TaskAgent**: Create tasks from decisions (e.g., "Book Grand Hotel")
- **BudgetAgent**: Update budget based on decisions
- **VendorAgent**: Connect decisions to vendor selections
- **PlanningAgent**: Integrate decisions into overall event plan

## Data Schema

### Poll

```typescript
interface Poll {
  id: string;
  title: string;
  description?: string;
  type: 'single_choice' | 'multi_choice' | 'ranked' | 'yes_no';
  options: PollOption[];
  votingPeriod?: { startTime: number; endTime: number };
  allowedVoters?: string[];
  minVotes?: number;
  maxChoices?: number;
  createdBy: string;
  createdAt: number;
  status: 'draft' | 'active' | 'closed' | 'cancelled';
}
```

### Vote

```typescript
interface Vote {
  id: string;
  pollId: string;
  userId: string;
  userName: string;
  choices: string[];
  ranking?: Record<string, number>;
  timestamp: number;
}
```

### Decision

```typescript
interface Decision {
  id: string;
  title: string;
  description: string;
  pollId?: string;
  decision: string;
  rationale: string;
  impact: {
    scope: 'high' | 'medium' | 'low';
    areas: string[];
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
```

## Best Practices

### Creating Polls

1. **Clear options**: Make choices mutually exclusive and easy to understand
2. **Appropriate timing**: Don't make voting periods too short
3. **Right voters**: Consider who should participate (all vs. stakeholders)
4. **Poll type**: Match complexity to decision (simple = yes/no, complex = ranked)
5. **Context**: Include descriptions to help voters make informed choices

### Analyzing Results

1. **Wait for participation**: Low turnout weakens decision legitimacy
2. **Watch for splits**: Close races may need discussion
3. **Early closure**: Strong consensus can end poll early
4. **Note ties**: Ties require additional votes or discussion
5. **Context matters**: Consider voter demographics (stakeholders vs. general)

### Recording Decisions

1. **Capture rationale**: Document "why" not just "what"
2. **Full impact**: Include budget, timeline, and scope implications
3. **Clear ownership**: Identify who implements and who's affected
4. **Link evidence**: Connect to polls, discussions, and data
5. **Track status**: Update as decision moves through lifecycle

## Testing

See `CollaborationAgent.test.ts` for comprehensive test coverage including:

- Poll analysis for all types
- Consensus detection at all levels
- Vote summary generation
- Next steps suggestions
- Edge cases (ties, low participation, etc.)

## API Reference

### Constructor

```typescript
new CollaborationAgent(aiKey: string, tools: Tool[])
```

### Methods

#### `analyzePollResults(votes: Vote[], poll: Poll, totalEligibleVoters?: number): PollResults`

Analyzes votes and returns complete results with consensus detection.

#### `generateVoteSummary(pollResults: PollResults): Decision['voteSummary']`

Generates summary for decision recording.

#### `suggestNextSteps(poll: Poll, results: PollResults): string[]`

Recommends actions based on current poll status.

### Inherited from BaseAgent

#### `handle(context: AgentContext, config?: AgenticLoopConfig, intent?: string): Promise<AgentResponse>`

Main entry point for processing user requests.

#### `getSystemPrompt(context: AgentContext): string`

Returns specialized system prompt for collaboration tasks.

#### `getIntent(): string`

Returns 'collaboration' as the agent's primary intent.

## License

Part of the Delphi event planning system.
