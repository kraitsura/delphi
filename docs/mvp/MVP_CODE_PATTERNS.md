# MVP Code Patterns

**Reference Implementations:**
- `/web/src/components/fluid-ui/cards/TaskProposalCard.tsx`
- `/web/src/components/dashboard/TasksByVendor.tsx`
- `/web/src/lib/fluid-ui/store.ts`

---

## 1. Component Structure Pattern

```typescript
// /web/src/components/fluid-ui/cards/ExampleCard.tsx

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useDashboardStore } from "@/lib/fluid-ui/DashboardStoreContext";
import { Card } from "@/components/ui/card";

interface ExampleCardProps {
  eventId: Id<"events">;
  roomId?: Id<"rooms">;
  filter?: string;
  limit?: number;
  title?: string;
}

export function ExampleCard({
  eventId,
  filter,
  limit = 10,
  title = "Default Title"
}: ExampleCardProps) {
  // 1. Convex queries
  const data = useQuery(api.items.listByEvent, { eventId, filter, limit });

  // 2. Convex mutations
  const updateItem = useMutation(api.items.patch);

  // 3. Zustand store (if needed)
  const selectedItem = useDashboardStore(state => state.selections.itemId);
  const select = useDashboardStore(state => state.select);

  // 4. Loading/empty states
  if (data === undefined) return <LoadingSpinner />;
  if (data.length === 0) return <EmptyState message="No items yet" />;

  // 5. Event handlers
  const handleItemClick = (id: Id<"items">) => {
    select("itemId", id);
  };

  const handleUpdate = async (id: Id<"items">, updates: Partial<Item>) => {
    try {
      await updateItem({ id, ...updates });
    } catch (error) {
      toast.error("Failed to update item");
    }
  };

  // 6. Render
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.map(item => (
          <div
            key={item._id}
            onClick={() => handleItemClick(item._id)}
            className={selectedItem === item._id ? "selected" : ""}
          >
            {item.name}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

---

## 2. Zustand Master Component Pattern

**Purpose:** Emit selections that detail components read

```typescript
// Master component: TasksByVendor.tsx

export function TasksByVendor({ eventId }: Props) {
  const tasks = useQuery(api.tasks.listByEvent, { eventId });

  // Write to Zustand
  const select = useDashboardStore(state => state.select);
  const clearSelection = useDashboardStore(state => state.clearSelection);
  const selectedVendor = useDashboardStore(state => state.selections.vendorId);

  // Group tasks by vendor
  const grouped = useMemo(() => {
    const groups = new Map<string, Task[]>();
    tasks?.forEach(task => {
      const vendorId = task.vendorId || "unassigned";
      if (!groups.has(vendorId)) groups.set(vendorId, []);
      groups.get(vendorId)!.push(task);
    });
    return groups;
  }, [tasks]);

  const handleVendorClick = (vendorId: string) => {
    if (selectedVendor === vendorId) {
      clearSelection("vendorId"); // Toggle off
    } else {
      select("vendorId", vendorId); // Select
    }
  };

  return (
    <Card>
      {Array.from(grouped.entries()).map(([vendorId, vendorTasks]) => (
        <div
          key={vendorId}
          onClick={() => handleVendorClick(vendorId)}
          className={selectedVendor === vendorId ? "selected" : ""}
        >
          <h4>{vendorId}</h4>
          <span>{vendorTasks.length} tasks</span>
        </div>
      ))}
    </Card>
  );
}
```

---

## 3. Zustand Detail Component Pattern

**Purpose:** Read selections and filter data

```typescript
// Detail component: ExpensesList.tsx

export function ExpensesList({ eventId }: Props) {
  const expenses = useQuery(api.expenses.listByEvent, { eventId });

  // Read from Zustand
  const selectedVendor = useDashboardStore(state => state.selections.vendorId);
  const selectedCategory = useDashboardStore(state => state.selections.category);
  const isHighlighted = useIsHighlighted(useDashboardStore, "expenses-list");

  // Filter based on selections
  const filtered = useMemo(() => {
    if (!expenses) return [];

    let result = expenses;

    if (selectedVendor) {
      result = result.filter(e => e.vendorId === selectedVendor);
    }

    if (selectedCategory) {
      result = result.filter(e => e.category === selectedCategory);
    }

    return result;
  }, [expenses, selectedVendor, selectedCategory]);

  return (
    <Card
      data-testid="expenses-list"
      className={isHighlighted ? "highlighted" : ""}
    >
      {filtered.map(expense => (
        <ExpenseItem key={expense._id} expense={expense} />
      ))}
    </Card>
  );
}
```

---

## 4. Convex Real-time Subscription Pattern

```typescript
// Component automatically re-renders when data changes

export function LiveTaskList({ eventId }: Props) {
  // useQuery creates subscription
  const tasks = useQuery(api.tasks.listByEvent, { eventId });

  // Component re-renders when:
  // - Task created (tasks array grows)
  // - Task updated (task properties change)
  // - Task deleted (tasks array shrinks)

  // No polling, no manual refresh needed

  return (
    <div>
      {tasks?.map(task => (
        <TaskItem key={task._id} task={task} />
      ))}
    </div>
  );
}
```

---

## 5. Proposal Confirmation Pattern

**Reference:** `/web/src/components/fluid-ui/cards/TaskProposalCard.tsx`

```typescript
export function ProposalCard({ proposalId, items, expiresAt }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedItems, setEditedItems] = useState(items);
  const confirm = useMutation(api.proposals.confirm);

  const isExpired = Date.now() > expiresAt;
  const timeLeft = expiresAt - Date.now();

  const handleAcceptAll = async () => {
    try {
      await confirm({
        proposalId,
        action: "accept_all"
      });
      toast.success(`Created ${items.length} items`);
    } catch (error) {
      toast.error("Failed to accept proposal");
    }
  };

  const handleEdit = () => setIsEditing(true);

  const handleSaveEdits = async () => {
    try {
      await confirm({
        proposalId,
        action: "edit",
        editedItems
      });
      setIsEditing(false);
    } catch (error) {
      toast.error("Failed to save edits");
    }
  };

  const handleReject = async () => {
    try {
      await confirm({
        proposalId,
        action: "reject"
      });
    } catch (error) {
      toast.error("Failed to reject proposal");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{items.length} items ready to create</CardTitle>
        <CountdownTimer expiresAt={expiresAt} />
      </CardHeader>

      <CardContent>
        {isEditing ? (
          <ItemEditor items={editedItems} onChange={setEditedItems} />
        ) : (
          <ItemPreview items={items} />
        )}
      </CardContent>

      <CardFooter>
        {isExpired ? (
          <p className="text-muted">This proposal has expired</p>
        ) : isEditing ? (
          <>
            <Button onClick={handleSaveEdits}>Save & Create</Button>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button onClick={handleAcceptAll}>Accept All</Button>
            <Button variant="outline" onClick={handleEdit}>
              Edit
            </Button>
            <Button variant="ghost" onClick={handleReject}>
              Reject
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
```

---

## 6. Agent Invocation Pattern

**Reference:** `/web/src/hooks/useAgentInvoke.ts`

```typescript
export function useAgentInvoke() {
  const convexToken = useConvexAuth(); // Get auth token
  const eventId = useCurrentEvent();
  const roomId = useCurrentRoom();

  const invokeAgent = async (message: string) => {
    try {
      const response = await fetch(
        `${WORKER_URL}/api/room/${roomId}/invoke`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${convexToken}`
          },
          body: JSON.stringify({
            message: {
              content: message,
              authorType: "user",
              eventId,
              roomId
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error("Agent invocation failed");
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Agent invocation error:", error);
      toast.error("Failed to contact AI assistant");
      throw error;
    }
  };

  return { invokeAgent };
}

// Usage in component
function ChatInput() {
  const { invokeAgent } = useAgentInvoke();
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsLoading(true);
    try {
      await invokeAgent(message);
      setMessage("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={message}
        onChange={e => setMessage(e.target.value)}
        disabled={isLoading}
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? "Sending..." : "Send"}
      </button>
    </form>
  );
}
```

---

## 7. FluidUIMessageRenderer Pattern

**Reference:** `/web/src/components/messages/FluidUIMessageRenderer.tsx`

```typescript
export function FluidUIMessageRenderer({ message }: Props) {
  const { aiMetadata } = message;

  if (!aiMetadata?.structuredData) {
    // Fallback: render as markdown
    return <MarkdownRenderer content={message.content} />;
  }

  const { structuredData } = aiMetadata;

  // Route based on type
  switch (structuredData.type) {
    case "proposal":
      return <ProposalRenderer proposal={structuredData.proposal} />;

    case "dashboard":
      return <DashboardRenderer config={structuredData.config} />;

    case "interactive_prompt":
      return <InteractivePromptRenderer prompt={structuredData.prompt} />;

    case "task_result":
      return <TaskResultRenderer result={structuredData.result} />;

    default:
      // Unknown type: hybrid mode (markdown + data)
      return (
        <div>
          <MarkdownRenderer content={message.content} />
          <pre>{JSON.stringify(structuredData, null, 2)}</pre>
        </div>
      );
  }
}

// Sub-renderer for proposals
function ProposalRenderer({ proposal }: { proposal: ProposalMetadata }) {
  const { proposalType } = proposal;

  switch (proposalType) {
    case "tasks":
      return <TaskProposalCard {...proposal} />;
    case "budget_entries":
      return <BudgetProposalCard {...proposal} />;
    case "vendor_suggestions":
      return <VendorProposalCard {...proposal} />;
    default:
      return <GenericProposalCard {...proposal} />;
  }
}
```

---

## 8. Component Registration Pattern

**Reference:** `/web/src/lib/fluid-ui/registerMessageComponents.ts`

```typescript
import { registerComponent } from "./registry";
import { TaskListCard } from "@/components/fluid-ui/cards/TaskListCard";
import { BudgetSummaryCard } from "@/components/fluid-ui/cards/BudgetSummaryCard";
// ... other imports

export function registerAllComponents() {
  // Fluid UI Cards
  registerComponent("TaskListCard", TaskListCard, {
    category: "data_display",
    description: "Compact task list with quick actions",
    requiredProps: ["eventId"],
    optionalProps: ["roomId", "filter", "limit", "title"]
  });

  registerComponent("BudgetSummaryCard", BudgetSummaryCard, {
    category: "data_display",
    description: "Budget overview with category breakdown",
    requiredProps: ["eventId"],
    optionalProps: ["title", "showCategories"]
  });

  // Interactive Components
  registerComponent("InlinePoll", InlinePoll, {
    category: "interactive",
    description: "AI-generated poll with voting",
    requiredProps: ["pollId", "question", "options", "eventId", "roomId"],
    optionalProps: ["allowMultipleChoices", "deadline"]
  });

  // Dashboard Components
  registerComponent("TasksByVendor", TasksByVendor, {
    category: "master",
    description: "Groups tasks by vendor (master component)",
    requiredProps: ["eventId"],
    emits: ["vendorId"]
  });

  registerComponent("ExpensesList", ExpensesList, {
    category: "detail",
    description: "Filters expenses by vendor (detail component)",
    requiredProps: ["eventId"],
    listensTo: ["vendorId", "category"]
  });
}

// Call during app initialization
// /web/src/main.tsx or /web/src/App.tsx
import { registerAllComponents } from "@/lib/fluid-ui/registerMessageComponents";

registerAllComponents();
```

---

## 9. Error Handling Pattern

```typescript
export function RobustComponent({ eventId }: Props) {
  const data = useQuery(api.items.list, { eventId });
  const update = useMutation(api.items.patch);

  // 1. Loading state
  if (data === undefined) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Spinner />
          <span className="ml-2">Loading...</span>
        </CardContent>
      </Card>
    );
  }

  // 2. Empty state
  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="text-center p-8 text-muted-foreground">
          <p>No items yet</p>
          <p className="text-sm">Create your first item to get started</p>
        </CardContent>
      </Card>
    );
  }

  // 3. Mutation error handling
  const handleUpdate = async (id: Id<"items">, updates: Partial<Item>) => {
    try {
      await update({ id, ...updates });
      toast.success("Item updated");
    } catch (error) {
      console.error("Update failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update item. Please try again."
      );
    }
  };

  // 4. Render with error boundary
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <Card>
        {data.map(item => (
          <ItemRow
            key={item._id}
            item={item}
            onUpdate={handleUpdate}
          />
        ))}
      </Card>
    </ErrorBoundary>
  );
}
```

---

## 10. Accessibility Pattern

```typescript
export function AccessibleCard({ eventId }: Props) {
  const items = useQuery(api.items.list, { eventId });
  const selectedItem = useDashboardStore(state => state.selections.itemId);
  const select = useDashboardStore(state => state.select);

  return (
    <Card>
      <CardHeader>
        <CardTitle id="card-title">Items</CardTitle>
      </CardHeader>

      <CardContent>
        <ul
          role="list"
          aria-labelledby="card-title"
        >
          {items?.map(item => (
            <li
              key={item._id}
              role="button"
              tabIndex={0}
              aria-selected={selectedItem === item._id}
              onClick={() => select("itemId", item._id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  select("itemId", item._id);
                }
              }}
            >
              {item.name}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
```

---

## 11. Performance Optimization Pattern

```typescript
export function OptimizedList({ eventId }: Props) {
  // 1. Memoize expensive computations
  const items = useQuery(api.items.list, { eventId });
  const selectedVendor = useDashboardStore(state => state.selections.vendorId);

  const filtered = useMemo(() => {
    if (!items) return [];
    return selectedVendor
      ? items.filter(i => i.vendorId === selectedVendor)
      : items;
  }, [items, selectedVendor]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => a.priority - b.priority);
  }, [filtered]);

  // 2. Memoize callbacks
  const handleSelect = useCallback((id: Id<"items">) => {
    select("itemId", id);
  }, [select]);

  // 3. Memoize child components
  const MemoizedItemRow = memo(ItemRow);

  return (
    <Card>
      {sorted.map(item => (
        <MemoizedItemRow
          key={item._id}
          item={item}
          onSelect={handleSelect}
        />
      ))}
    </Card>
  );
}
```

---

## References

- Zustand docs: https://github.com/pmndrs/zustand
- Convex React: https://docs.convex.dev/client/react
- shadcn/ui components: https://ui.shadcn.com/
- Existing implementations: `/web/src/components/fluid-ui/cards/`
