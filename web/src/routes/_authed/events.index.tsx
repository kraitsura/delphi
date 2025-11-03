import { createFileRoute, Link } from "@tanstack/react-router";
import { EventList } from "@/components/events/event-list";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authed/events/")({
  component: EventsPage,
});

function EventsPage() {
  const [statusFilter, setStatusFilter] = useState<
    "planning" | "in_progress" | "completed" | "cancelled" | "archived" | undefined
  >(undefined);

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Events</h1>
          <p className="text-gray-600">
            Manage and track all your events in one place
          </p>
        </div>
        <Link to="/events/new">
          <Button>
            <PlusCircle className="h-5 w-5 mr-2" />
            Create Event
          </Button>
        </Link>
      </div>

      {/* Status Filter */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter(undefined)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              statusFilter === undefined
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            All Events
          </button>
          <button
            onClick={() => setStatusFilter("planning")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              statusFilter === "planning"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Planning
          </button>
          <button
            onClick={() => setStatusFilter("in_progress")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              statusFilter === "in_progress"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            In Progress
          </button>
          <button
            onClick={() => setStatusFilter("completed")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              statusFilter === "completed"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => setStatusFilter("archived")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              statusFilter === "archived"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Archived
          </button>
        </div>
      </div>

      {/* Events List */}
      <EventList status={statusFilter} />
    </div>
  );
}
