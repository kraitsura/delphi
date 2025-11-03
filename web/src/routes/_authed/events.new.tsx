import { createFileRoute } from "@tanstack/react-router";
import { EventCreateForm } from "@/components/events/event-create-form";

export const Route = createFileRoute("/_authed/events/new")({
  component: NewEventPage,
});

function NewEventPage() {
  return (
    <div className="container mx-auto p-6">
      <EventCreateForm />
    </div>
  );
}
