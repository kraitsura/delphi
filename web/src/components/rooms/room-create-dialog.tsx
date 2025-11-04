import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus } from "lucide-react";
import { UserSearch } from "@/components/user/user-search";

interface RoomCreateDialogProps {
  eventId: Id<"events">;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

type RoomType = "main" | "vendor" | "topic" | "guest_announcements" | "private";

export function RoomCreateDialog({
  eventId,
  trigger,
  onSuccess,
}: RoomCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<RoomType>("topic");
  const [allowGuestMessages, setAllowGuestMessages] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<{
    _id: string;
    name: string;
  } | null>(null);

  const createRoom = useMutation(api.rooms.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert("Room name is required");
      return;
    }

    if (type === "vendor" && !selectedVendor) {
      alert("Please select a vendor for vendor rooms");
      return;
    }

    try {
      await createRoom({
        eventId,
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        allowGuestMessages,
        vendorId: selectedVendor ? (selectedVendor._id as Id<"users">) : undefined,
      });

      // Reset form
      setName("");
      setDescription("");
      setType("topic");
      setAllowGuestMessages(false);
      setSelectedVendor(null);
      setOpen(false);

      onSuccess?.();
    } catch (error) {
      console.error("Failed to create room:", error);
      alert(error instanceof Error ? error.message : "Failed to create room");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Room
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Room</DialogTitle>
          <DialogDescription>
            Create a new chat room for your event. Choose a type and configure
            permissions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Room Name */}
          <div className="space-y-2">
            <Label htmlFor="room-name">
              Room Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="room-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Catering Discussion"
              required
            />
          </div>

          {/* Room Type */}
          <div className="space-y-2">
            <Label htmlFor="room-type">
              Room Type <span className="text-red-500">*</span>
            </Label>
            <Select value={type} onValueChange={(v) => setType(v as RoomType)}>
              <SelectTrigger id="room-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="topic">Topic Room</SelectItem>
                <SelectItem value="vendor">Vendor Room</SelectItem>
                <SelectItem value="private">Private Room</SelectItem>
                <SelectItem value="guest_announcements">
                  Guest Announcements
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">
              {type === "topic" &&
                "Topic-based discussions (catering, music, etc.)"}
              {type === "vendor" && "Dedicated room for vendor coordination"}
              {type === "private" && "Private room for coordinators only"}
              {type === "guest_announcements" &&
                "Broadcast announcements to guests"}
            </p>
          </div>

          {/* Vendor Selection (only for vendor type) */}
          {type === "vendor" && (
            <div className="space-y-2">
              <Label>
                Select Vendor <span className="text-red-500">*</span>
              </Label>
              {selectedVendor ? (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div>
                    <p className="font-medium">{selectedVendor.name}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedVendor(null)}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <UserSearch
                  onSelectUser={(user) =>
                    setSelectedVendor({ _id: user._id, name: user.name })
                  }
                  placeholder="Search for vendor by name..."
                />
              )}
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="room-description">Description</Label>
            <Textarea
              id="room-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the room's purpose..."
              rows={3}
            />
          </div>

          {/* Allow Guest Messages */}
          <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
            <div className="flex-1 space-y-1">
              <Label htmlFor="guest-messages" className="cursor-pointer">
                Allow Guest Messages
              </Label>
              <p className="text-sm text-gray-500">
                Let guests post messages in this room
              </p>
            </div>
            <Switch
              id="guest-messages"
              checked={allowGuestMessages}
              onCheckedChange={setAllowGuestMessages}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create Room</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
