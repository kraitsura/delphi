/**
 * Mock Data Generators for Fluid UI Testbed
 * Provides realistic test data for all dashboard components
 */

import type { Id } from "@/convex/_generated/dataModel";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type DataScenario = "empty" | "minimal" | "normal" | "heavy" | "edge";

export interface MockEvent {
  _id: Id<"events">;
  _creationTime: number;
  name: string;
  description: string;
  status: "planning" | "in_progress" | "completed";
  date: number;
  location?: string;
  budget?: number;
  spent?: number;
  userId: Id<"users">;
}

export interface MockTask {
  _id: Id<"tasks">;
  _creationTime: number;
  eventId: Id<"events">;
  title: string;
  description: string;
  status: "not_started" | "in_progress" | "blocked" | "completed";
  priority: "low" | "medium" | "high" | "urgent";
  assignee?: string;
  dueDate?: number;
  category?: string;
  // Event planning specific fields (hybrid approach)
  phase?: "planning" | "vendor_selection" | "design" | "logistics" | "day_of" | "post_event";
  vendor?: string;
  dependencies?: string[]; // Array of task IDs this task depends on
  criticalPath?: boolean;
  dayOfSequence?: number; // Event day timeline order (e.g., 1, 2, 3...)
  estimatedDuration?: number; // Duration in minutes
  completionPercentage?: number; // 0-100 for partially complete tasks
}

export interface MockExpense {
  _id: Id<"expenses">;
  _creationTime: number;
  eventId: Id<"events">;
  description: string;
  amount: number;
  category: string;
  vendor?: string;
  status: "pending" | "paid" | "overdue";
  dueDate?: number;
  paidDate?: number;
}

export interface MockPoll {
  _id: Id<"polls">;
  _creationTime: number;
  eventId: Id<"events">;
  roomId: Id<"rooms">;
  question: string;
  options: Array<{
    id: string;
    text: string;
    votes: number;
  }>;
  totalVotes: number;
  status: "active" | "closed";
  closesAt?: number;
  userHasVoted: boolean;
}

export interface MockRoom {
  _id: Id<"rooms">;
  _creationTime: number;
  eventId: Id<"events">;
  name: string;
  lastActivity?: number;
  unreadCount: number;
  lastMessage?: string;
}

export interface MockMessage {
  _id: Id<"messages">;
  _creationTime: number;
  roomId: Id<"rooms">;
  userId: Id<"users">;
  userName: string;
  content: string;
}

// ============================================================================
// MOCK DATA GENERATORS
// ============================================================================

const MOCK_EVENT_ID = "k17dv8z9q8r7s6t5u4v3w2x1" as Id<"events">;
const MOCK_USER_ID = "j16cu7y8p7q6r5s4t3u2v1w0" as Id<"users">;

// Event Names
const EVENT_NAMES = [
  "Q4 Product Launch",
  "Annual Tech Conference",
  "Summer Team Retreat",
  "Client Onboarding Workshop",
  "Spring Marketing Campaign",
  "Fall Sales Kickoff",
];

// Task Templates with event planning metadata
const TASK_TEMPLATES = [
  { title: "Finalize venue contract", category: "venue", priority: "high", phase: "vendor_selection", vendor: "Grand Hall Venues", criticalPath: true, estimatedDuration: 120 },
  { title: "Design event branding materials", category: "design", priority: "medium", phase: "design", vendor: "Creative Studio Pro", estimatedDuration: 240 },
  { title: "Send speaker invitations", category: "communication", priority: "high", phase: "planning", criticalPath: true, estimatedDuration: 60 },
  { title: "Order catering for 150 guests", category: "catering", priority: "urgent", phase: "vendor_selection", vendor: "Gourmet Catering Co", criticalPath: true, estimatedDuration: 90 },
  { title: "Set up registration system", category: "technology", priority: "high", phase: "logistics", criticalPath: true, estimatedDuration: 180 },
  { title: "Create event timeline", category: "planning", priority: "medium", phase: "planning", estimatedDuration: 120 },
  { title: "Book photographer", category: "media", priority: "medium", phase: "vendor_selection", vendor: "Shutter Perfect", estimatedDuration: 30 },
  { title: "Prepare welcome packets", category: "logistics", priority: "low", phase: "logistics", estimatedDuration: 180 },
  { title: "Test AV equipment", category: "technology", priority: "high", phase: "day_of", dayOfSequence: 1, estimatedDuration: 60 },
  { title: "Coordinate parking arrangements", category: "logistics", priority: "low", phase: "logistics", estimatedDuration: 45 },
  { title: "Print name badges", category: "materials", priority: "medium", phase: "logistics", estimatedDuration: 90 },
  { title: "Confirm transportation", category: "logistics", priority: "medium", phase: "logistics", vendor: "Executive Transport", estimatedDuration: 30 },
  { title: "Review safety protocols", category: "safety", priority: "urgent", phase: "planning", criticalPath: true, estimatedDuration: 90 },
  { title: "Update event website", category: "marketing", priority: "medium", phase: "design", estimatedDuration: 120 },
  { title: "Schedule rehearsal", category: "planning", priority: "high", phase: "logistics", criticalPath: true, estimatedDuration: 60 },
  { title: "Guest arrival setup", category: "setup", priority: "urgent", phase: "day_of", dayOfSequence: 2, estimatedDuration: 30 },
  { title: "Welcome ceremony", category: "ceremony", priority: "urgent", phase: "day_of", dayOfSequence: 3, estimatedDuration: 15 },
  { title: "Keynote presentation", category: "presentation", priority: "urgent", phase: "day_of", dayOfSequence: 4, estimatedDuration: 45 },
  { title: "Lunch service", category: "catering", priority: "high", phase: "day_of", dayOfSequence: 5, vendor: "Gourmet Catering Co", estimatedDuration: 60 },
  { title: "Afternoon workshops", category: "programming", priority: "high", phase: "day_of", dayOfSequence: 6, estimatedDuration: 90 },
];

// Expense Categories
const EXPENSE_CATEGORIES = [
  "venue",
  "catering",
  "photography",
  "music",
  "flowers",
  "attire",
  "invitations",
  "travel",
  "other",
];

const EXPENSE_TEMPLATES = [
  { description: "Venue deposit", category: "venue", amount: 5000 },
  { description: "Catering services", category: "catering", amount: 3500 },
  { description: "Photography package", category: "photography", amount: 2000 },
  { description: "DJ and sound system", category: "music", amount: 1500 },
  { description: "Floral arrangements", category: "flowers", amount: 1200 },
  { description: "Printed invitations", category: "invitations", amount: 800 },
  { description: "Transportation", category: "travel", amount: 600 },
  { description: "Decorations", category: "other", amount: 450 },
  { description: "AV equipment rental", category: "other", amount: 900 },
  { description: "Event insurance", category: "other", amount: 350 },
];

// Poll Questions
const POLL_QUESTIONS = [
  {
    question: "Preferred catering style?",
    options: ["Buffet", "Plated Dinner", "Food Stations", "Family Style"],
  },
  {
    question: "Best time for team activity?",
    options: ["Morning", "Afternoon", "Evening"],
  },
  {
    question: "Venue preference?",
    options: ["Downtown Hotel", "Beach Resort", "Mountain Lodge", "Urban Loft"],
  },
  {
    question: "Preferred transportation?",
    options: ["Shuttle Bus", "Individual Cars", "Carpooling"],
  },
];

// Room Names
const ROOM_NAMES = [
  "General Discussion",
  "Planning Committee",
  "Budget & Finance",
  "Vendor Coordination",
  "Marketing Team",
];

// Message Templates
const MESSAGE_TEMPLATES = [
  "Just confirmed the venue for next Saturday!",
  "Can someone review the updated budget spreadsheet?",
  "Photographer sent over the contract - looks good",
  "We need to finalize the guest list by EOD",
  "Caterer is asking about dietary restrictions",
  "Updated the timeline document with new deadlines",
  "Great news - we got approval for the additional budget",
  "Reminder: team meeting tomorrow at 2pm",
];

// ============================================================================
// GENERATOR FUNCTIONS
// ============================================================================

export function generateMockEvent(scenario: DataScenario = "normal"): MockEvent {
  return {
    _id: MOCK_EVENT_ID,
    _creationTime: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
    name: EVENT_NAMES[0],
    description: "A comprehensive product launch event showcasing our latest innovations",
    status: "in_progress",
    date: Date.now() + 45 * 24 * 60 * 60 * 1000, // 45 days from now
    location: "Tech Convention Center, San Francisco",
    budget: 50000,
    spent: 32500,
    userId: MOCK_USER_ID,
  };
}

export function generateMockEvents(scenario: DataScenario = "normal"): MockEvent[] {
  const counts = {
    empty: 0,
    minimal: 1,
    normal: 4,
    heavy: 10,
    edge: 6,
  };

  const count = counts[scenario];
  const events: MockEvent[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const daysUntilEvent = (i + 1) * 30;
    events.push({
      _id: `event_${i}` as Id<"events">,
      _creationTime: now - (60 - i * 5) * 24 * 60 * 60 * 1000,
      name: EVENT_NAMES[i % EVENT_NAMES.length],
      description: `Planning and coordination for ${EVENT_NAMES[i % EVENT_NAMES.length]}`,
      status: i === 0 ? "in_progress" : i % 3 === 0 ? "completed" : "planning",
      date: now + daysUntilEvent * 24 * 60 * 60 * 1000,
      location: i % 2 === 0 ? "San Francisco, CA" : "Austin, TX",
      budget: 20000 + i * 10000,
      spent: (20000 + i * 10000) * (0.3 + Math.random() * 0.4),
      userId: MOCK_USER_ID,
    });
  }

  return events;
}

export function generateMockTasks(scenario: DataScenario = "normal"): MockTask[] {
  const counts = {
    empty: 0,
    minimal: 3,
    normal: 12,
    heavy: 500,
    edge: 8,
  };

  const count = counts[scenario];
  const tasks: MockTask[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const template = TASK_TEMPLATES[i % TASK_TEMPLATES.length];
    const statusOptions: MockTask["status"][] = ["not_started", "in_progress", "blocked", "completed"];
    const priorityOptions: MockTask["priority"][] = ["low", "medium", "high", "urgent"];

    // Generate dependencies for tasks (some tasks depend on earlier tasks)
    const dependencies: string[] = [];
    if (i > 2 && Math.random() > 0.5) {
      // Randomly add 1-2 dependencies from earlier tasks
      const depCount = Math.random() > 0.7 ? 2 : 1;
      for (let d = 0; d < depCount; d++) {
        const depIndex = Math.floor(Math.random() * i);
        dependencies.push(`task_${depIndex}`);
      }
    }

    tasks.push({
      _id: `task_${i}` as Id<"tasks">,
      _creationTime: now - (30 - i) * 24 * 60 * 60 * 1000,
      eventId: MOCK_EVENT_ID,
      title: template.title,
      description: `Details for ${template.title.toLowerCase()}`,
      status: statusOptions[i % statusOptions.length],
      priority: scenario === "edge" ? priorityOptions[i % priorityOptions.length] : (template.priority as MockTask["priority"]),
      assignee: i % 3 === 0 ? "Sarah Chen" : i % 3 === 1 ? "Mike Rodriguez" : i % 3 === 2 ? "Jordan Kim" : "Alex Thompson",
      dueDate: now + (i - count / 2) * 5 * 24 * 60 * 60 * 1000,
      category: template.category,
      // Event planning fields
      phase: template.phase as MockTask["phase"],
      vendor: template.vendor,
      dependencies: dependencies.length > 0 ? dependencies : undefined,
      criticalPath: template.criticalPath,
      dayOfSequence: template.dayOfSequence,
      estimatedDuration: template.estimatedDuration,
      completionPercentage: statusOptions[i % statusOptions.length] === "in_progress" ? Math.floor(Math.random() * 70) + 20 : undefined,
    });
  }

  return tasks;
}

export function generateMockExpenses(scenario: DataScenario = "normal"): MockExpense[] {
  const counts = {
    empty: 0,
    minimal: 3,
    normal: 10,
    heavy: 250,
    edge: 7,
  };

  const count = counts[scenario];
  const expenses: MockExpense[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const template = EXPENSE_TEMPLATES[i % EXPENSE_TEMPLATES.length];
    const statusOptions: MockExpense["status"][] = ["pending", "paid", "overdue"];
    const isPaid = i % 3 === 0;
    const isOverdue = i % 5 === 0 && !isPaid;

    expenses.push({
      _id: `expense_${i}` as Id<"expenses">,
      _creationTime: now - (25 - i) * 24 * 60 * 60 * 1000,
      eventId: MOCK_EVENT_ID,
      description: template.description,
      amount: template.amount + (scenario === "heavy" ? Math.random() * 500 : 0),
      category: template.category,
      vendor: i % 2 === 0 ? `Vendor ${Math.floor(i / 2) + 1}` : undefined,
      status: isPaid ? "paid" : isOverdue ? "overdue" : "pending",
      dueDate: now + (i - count / 2) * 7 * 24 * 60 * 60 * 1000,
      paidDate: isPaid ? now - i * 2 * 24 * 60 * 60 * 1000 : undefined,
    });
  }

  return expenses;
}

export function generateMockPolls(scenario: DataScenario = "normal"): MockPoll[] {
  const counts = {
    empty: 0,
    minimal: 1,
    normal: 4,
    heavy: 12,
    edge: 3,
  };

  const count = counts[scenario];
  const polls: MockPoll[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const template = POLL_QUESTIONS[i % POLL_QUESTIONS.length];
    const totalVotes = Math.floor(Math.random() * 50) + 10;

    const options = template.options.map((text, idx) => ({
      id: `option_${i}_${idx}`,
      text,
      votes: idx === 0 ? Math.floor(totalVotes * 0.4) : Math.floor(totalVotes * 0.2),
    }));

    polls.push({
      _id: `poll_${i}` as Id<"polls">,
      _creationTime: now - (20 - i * 2) * 24 * 60 * 60 * 1000,
      eventId: MOCK_EVENT_ID,
      roomId: `room_${i % 3}` as Id<"rooms">,
      question: template.question,
      options,
      totalVotes,
      status: i % 4 === 0 ? "closed" : "active",
      closesAt: i % 4 === 0 ? now - 2 * 24 * 60 * 60 * 1000 : now + 7 * 24 * 60 * 60 * 1000,
      userHasVoted: i % 2 === 0,
    });
  }

  return polls;
}

export function generateMockRooms(scenario: DataScenario = "normal"): MockRoom[] {
  const counts = {
    empty: 0,
    minimal: 2,
    normal: 5,
    heavy: 15,
    edge: 4,
  };

  const count = counts[scenario];
  const rooms: MockRoom[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    rooms.push({
      _id: `room_${i}` as Id<"rooms">,
      _creationTime: now - (40 - i * 2) * 24 * 60 * 60 * 1000,
      eventId: MOCK_EVENT_ID,
      name: ROOM_NAMES[i % ROOM_NAMES.length],
      lastActivity: now - i * 3 * 60 * 60 * 1000, // Hours ago
      unreadCount: i === 0 ? 5 : i % 3 === 0 ? 2 : 0,
      lastMessage: MESSAGE_TEMPLATES[i % MESSAGE_TEMPLATES.length],
    });
  }

  return rooms;
}

export function generateMockMessages(roomId: Id<"rooms">, scenario: DataScenario = "normal"): MockMessage[] {
  const counts = {
    empty: 0,
    minimal: 3,
    normal: 15,
    heavy: 100,
    edge: 8,
  };

  const count = counts[scenario];
  const messages: MockMessage[] = [];
  const now = Date.now();

  const users = [
    { id: "user_1" as Id<"users">, name: "Sarah Chen" },
    { id: "user_2" as Id<"users">, name: "Mike Rodriguez" },
    { id: "user_3" as Id<"users">, name: "Emily Taylor" },
  ];

  for (let i = 0; i < count; i++) {
    const user = users[i % users.length];
    messages.push({
      _id: `message_${roomId}_${i}` as Id<"messages">,
      _creationTime: now - (count - i) * 30 * 60 * 1000, // 30 mins apart
      roomId,
      userId: user.id,
      userName: user.name,
      content: MESSAGE_TEMPLATES[i % MESSAGE_TEMPLATES.length],
    });
  }

  return messages;
}

// ============================================================================
// COMPOSITE DATA GENERATOR
// ============================================================================

export interface MockDataSet {
  event: MockEvent;
  events: MockEvent[];
  tasks: MockTask[];
  expenses: MockExpense[];
  polls: MockPoll[];
  rooms: MockRoom[];
  messages: MockMessage[];
}

export function generateMockDataSet(scenario: DataScenario = "normal"): MockDataSet {
  const event = generateMockEvent(scenario);
  const events = generateMockEvents(scenario);
  const tasks = generateMockTasks(scenario);
  const expenses = generateMockExpenses(scenario);
  const polls = generateMockPolls(scenario);
  const rooms = generateMockRooms(scenario);
  const messages = rooms.length > 0 ? generateMockMessages(rooms[0]._id, scenario) : [];

  return {
    event,
    events,
    tasks,
    expenses,
    polls,
    rooms,
    messages,
  };
}

// ============================================================================
// CONVEX MOCK PROVIDER
// ============================================================================

/**
 * Creates a mock Convex query function for testbed use
 * Maps query names to mock data generators
 */
export function createMockConvexQuery(dataSet: MockDataSet) {
  return (api: any, args: any) => {
    const queryName = api.toString();

    // Event queries
    if (queryName.includes("events.getById")) return dataSet.event;
    if (queryName.includes("events.list")) return dataSet.events;

    // Task queries
    if (queryName.includes("tasks.listByEvent")) return dataSet.tasks;

    // Expense queries
    if (queryName.includes("expenses.listByEvent")) return dataSet.expenses;

    // Poll queries
    if (queryName.includes("polls.getById")) {
      const pollId = args?.pollId;
      return dataSet.polls.find(poll => poll._id === pollId) || null;
    }
    if (queryName.includes("polls.listByEvent")) return dataSet.polls;

    // Room queries
    if (queryName.includes("rooms.listByEvent")) return dataSet.rooms;

    // Message queries
    if (queryName.includes("messages.listByRoom")) return dataSet.messages;

    // Default empty array
    return [];
  };
}
