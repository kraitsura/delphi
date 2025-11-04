import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RoomList } from "@/components/rooms/room-list";
import { RoomCreateDialog } from "@/components/rooms/room-create-dialog";
import { MessageSquare, ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authed/events/$eventId/rooms/")({
  component: RoomsIndexPage,
});

function RoomsIndexPage() {
  const { eventId } = Route.useParams();

  const event = useQuery(api.events.getById, {
    eventId: eventId as Id<"events">,
  });

  const rooms = useQuery(api.rooms.listByEvent, {
    eventId: eventId as Id<"events">,
  });

  if (event === undefined) {
    return (
      <div className="container max-w-6xl mx-auto p-6">
        <Skeleton className="h-10 w-96 mb-8" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container max-w-6xl mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Event not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canManage = event.role === "coordinator";

  return (
    <div className="container max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link to="/events/$eventId" params={{ eventId }}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Rooms</h1>
            <p className="text-gray-500">{event.name}</p>
          </div>
        </div>
        {canManage && (
          <RoomCreateDialog
            eventId={eventId as Id<"events">}
            onSuccess={() => {
              // Rooms will auto-refresh via reactive query
            }}
          />
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rooms</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rooms === undefined ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                rooms.length
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Role</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium capitalize">
              {event.role}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Event Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium capitalize">
              {event.status.replace(/_/g, " ")}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rooms List */}
      <Card>
        <CardHeader>
          <CardTitle>All Rooms</CardTitle>
          <CardDescription>
            Chat rooms for coordinating different aspects of your event
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RoomList eventId={eventId as Id<"events">} />
        </CardContent>
      </Card>

      {/* Help Text */}
      {canManage && rooms && rooms.length === 0 && (
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-blue-900 mb-2">
              Get Started with Rooms
            </h3>
            <p className="text-sm text-blue-700 mb-4">
              Rooms help organize conversations for different aspects of your
              event. Here are some suggestions:
            </p>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>
                <strong>Topic Rooms:</strong> Create rooms for specific topics
                like catering, music, decorations
              </li>
              <li>
                <strong>Vendor Rooms:</strong> Dedicated spaces for coordinating
                with individual vendors
              </li>
              <li>
                <strong>Private Rooms:</strong> Coordinator-only discussions for
                sensitive planning
              </li>
              <li>
                <strong>Guest Announcements:</strong> Broadcast important updates
                to all guests
              </li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
