import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Link } from "@tanstack/react-router";
import { Calendar, MapPin, Users, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface EventListProps {
  status?: "planning" | "in_progress" | "completed" | "cancelled" | "archived";
}

export function EventList({ status }: EventListProps) {
  const events = useQuery(api.events.listUserEvents, {
    status,
  });

  if (events === undefined) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
              <div className="h-4 bg-gray-200 rounded w-full mb-2" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">No events found</p>
        <Link
          to="/events/new"
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Create your first event
        </Link>
      </div>
    );
  }

  const getStatusColor = (eventStatus: string) => {
    switch (eventStatus) {
      case "planning":
        return "bg-blue-100 text-blue-700";
      case "in_progress":
        return "bg-green-100 text-green-700";
      case "completed":
        return "bg-gray-100 text-gray-700";
      case "cancelled":
        return "bg-red-100 text-red-700";
      case "archived":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <Link key={event._id} to={`/events/${event._id}`}>
          <Card className="hover:shadow-lg transition-shadow h-full">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-semibold text-lg line-clamp-1">
                  {event.name}
                </h3>
                <span
                  className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ml-2 ${getStatusColor(
                    event.status
                  )}`}
                >
                  {event.status.replace("_", " ")}
                </span>
              </div>

              {event.description && (
                <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                  {event.description}
                </p>
              )}

              <div className="space-y-2 text-sm text-gray-500">
                {event.date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    <span>{new Date(event.date).toLocaleDateString()}</span>
                  </div>
                )}

                {event.location && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-1">
                      {event.location.city}, {event.location.state}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 flex-shrink-0" />
                  <span>
                    {event.guestCount.confirmed} / {event.guestCount.expected}{" "}
                    guests
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 flex-shrink-0" />
                  <span>
                    ${event.budget.spent.toLocaleString()} / $
                    {event.budget.total.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t text-xs text-gray-400">
                <span className="capitalize">{event.type}</span> •{" "}
                {new Date(event.createdAt).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
