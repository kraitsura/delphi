import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoomParticipantsList } from "@/components/rooms/room-participants-list";
import { AddParticipantDialog } from "@/components/rooms/add-participant-dialog";
import { RoomSettings } from "@/components/rooms/room-settings";
import { Hash, Lock, Megaphone, Users, Briefcase, ArrowLeft, UserPlus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authed/events/$eventId/rooms/$roomId")({
  component: RoomDetailPage,
});

type RoomType = "main" | "vendor" | "topic" | "guest_announcements" | "private";

function RoomDetailPage() {
  const { eventId, roomId } = Route.useParams();

  const room = useQuery(api.rooms.getById, {
    roomId: roomId as Id<"rooms">,
  });

  const stats = useQuery(api.rooms.getStats, {
    roomId: roomId as Id<"rooms">,
  });

  const getRoomIcon = (type: RoomType) => {
    switch (type) {
      case "main":
        return <Hash className="h-6 w-6 text-blue-500" />;
      case "private":
        return <Lock className="h-6 w-6 text-purple-500" />;
      case "guest_announcements":
        return <Megaphone className="h-6 w-6 text-green-500" />;
      case "vendor":
        return <Briefcase className="h-6 w-6 text-orange-500" />;
      default:
        return <Users className="h-6 w-6 text-gray-500" />;
    }
  };

  const getRoomTypeLabel = (type: RoomType) => {
    switch (type) {
      case "main":
        return "Main Planning";
      case "private":
        return "Private";
      case "guest_announcements":
        return "Guest Announcements";
      case "vendor":
        return "Vendor";
      case "topic":
        return "Topic";
      default:
        return "Other";
    }
  };

  if (room === undefined) {
    return (
      <div className="container max-w-6xl mx-auto p-6">
        <Skeleton className="h-10 w-96 mb-8" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="container max-w-6xl mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Room not found or you don't have access to it</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canManage = room.membership?.canManage ?? false;

  return (
    <div className="container max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <Link to="/events/$eventId/rooms" params={{ eventId }}>
          <Button variant="outline" size="icon" className="mt-1">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {getRoomIcon(room.type as RoomType)}
            <h1 className="text-3xl font-bold">{room.name}</h1>
          </div>
          {room.description && (
            <p className="text-gray-600 mb-2">{room.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm">
            <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-blue-700 font-medium capitalize">
              {getRoomTypeLabel(room.type as RoomType)}
            </span>
            {room.allowGuestMessages && (
              <span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-green-700 font-medium">
                Guests can post
              </span>
            )}
            {room.isArchived && (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-gray-700 font-medium">
                Archived
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats === undefined ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                stats.participantCount
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats === undefined ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                stats.messageCount
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Coming in Phase 1.5
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Role</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium">
              {canManage ? "Manager" : "Member"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="participants">
            Participants
            {stats && ` (${stats.participantCount})`}
          </TabsTrigger>
          {canManage && <TabsTrigger value="settings">Settings</TabsTrigger>}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Room Information</CardTitle>
              <CardDescription>Details about this room</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">
                  Room Type
                </h4>
                <p className="text-base capitalize">
                  {getRoomTypeLabel(room.type as RoomType)}
                </p>
              </div>

              {room.description && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">
                    Description
                  </h4>
                  <p className="text-base">{room.description}</p>
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">
                  Guest Messages
                </h4>
                <p className="text-base">
                  {room.allowGuestMessages ? "Allowed" : "Not allowed"}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">
                  Created
                </h4>
                <p className="text-base">
                  {new Date(room.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Placeholder for messages in Phase 1.5 */}
          <Card className="bg-gray-50">
            <CardContent className="pt-6 text-center">
              <p className="text-gray-500">
                💬 Real-time messaging will be available in Phase 1.5
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Participants Tab */}
        <TabsContent value="participants" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Participants</CardTitle>
                  <CardDescription>
                    People who can access this room
                  </CardDescription>
                </div>
                {canManage && (
                  <AddParticipantDialog
                    roomId={roomId as Id<"rooms">}
                    trigger={
                      <Button>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Participant
                      </Button>
                    }
                  />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <RoomParticipantsList
                roomId={roomId as Id<"rooms">}
                canManage={canManage}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        {canManage && (
          <TabsContent value="settings">
            <RoomSettings
              room={room}
              onUpdate={() => {
                // Room will auto-refresh via reactive query
              }}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
