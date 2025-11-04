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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { UserPlus } from "lucide-react";
import { UserSearch } from "@/components/user/user-search";

interface AddParticipantDialogProps {
  roomId: Id<"rooms">;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function AddParticipantDialog({
  roomId,
  trigger,
  onSuccess,
}: AddParticipantDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    _id: string;
    name: string;
    email: string;
  } | null>(null);
  const [permissions, setPermissions] = useState({
    canPost: true,
    canEdit: true,
    canDelete: false,
    canManage: false,
  });

  const addParticipant = useMutation(api.roomParticipants.addParticipant);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUser) {
      alert("Please select a user to add");
      return;
    }

    try {
      await addParticipant({
        roomId,
        userId: selectedUser._id as Id<"users">,
        permissions,
      });

      // Reset form
      setSelectedUser(null);
      setPermissions({
        canPost: true,
        canEdit: true,
        canDelete: false,
        canManage: false,
      });
      setOpen(false);

      onSuccess?.();
    } catch (error) {
      console.error("Failed to add participant:", error);
      alert(
        error instanceof Error ? error.message : "Failed to add participant"
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Participant
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Participant</DialogTitle>
          <DialogDescription>
            Add a user to this room and configure their permissions
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* User Selection */}
          <div className="space-y-2">
            <Label>
              Select User <span className="text-red-500">*</span>
            </Label>
            {selectedUser ? (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md border">
                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-10 overflow-hidden rounded-full border flex-shrink-0">
                    <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-600 font-semibold">
                      {selectedUser.name?.charAt(0).toUpperCase() || "?"}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium">{selectedUser.name}</p>
                    <p className="text-sm text-gray-500">{selectedUser.email}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedUser(null)}
                >
                  Change
                </Button>
              </div>
            ) : (
              <UserSearch
                onSelectUser={(user) =>
                  setSelectedUser({
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                  })
                }
                placeholder="Search for user by name or email..."
              />
            )}
          </div>

          {/* Permissions */}
          <div className="space-y-4">
            <Label>Permissions</Label>
            <div className="space-y-3 border rounded-lg p-4">
              {/* Can Post */}
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="can-post"
                  checked={permissions.canPost}
                  onCheckedChange={(checked) =>
                    setPermissions((prev) => ({
                      ...prev,
                      canPost: checked === true,
                    }))
                  }
                />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="can-post" className="cursor-pointer font-medium">
                    Can Post Messages
                  </Label>
                  <p className="text-sm text-gray-500">
                    Allow user to send messages in this room
                  </p>
                </div>
              </div>

              {/* Can Edit */}
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="can-edit"
                  checked={permissions.canEdit}
                  onCheckedChange={(checked) =>
                    setPermissions((prev) => ({
                      ...prev,
                      canEdit: checked === true,
                    }))
                  }
                />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="can-edit" className="cursor-pointer font-medium">
                    Can Edit Messages
                  </Label>
                  <p className="text-sm text-gray-500">
                    Allow user to edit their own messages
                  </p>
                </div>
              </div>

              {/* Can Delete */}
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="can-delete"
                  checked={permissions.canDelete}
                  onCheckedChange={(checked) =>
                    setPermissions((prev) => ({
                      ...prev,
                      canDelete: checked === true,
                    }))
                  }
                />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="can-delete" className="cursor-pointer font-medium">
                    Can Delete Messages
                  </Label>
                  <p className="text-sm text-gray-500">
                    Allow user to delete their own messages
                  </p>
                </div>
              </div>

              {/* Can Manage */}
              <div className="flex items-start space-x-3 pt-3 border-t">
                <Checkbox
                  id="can-manage"
                  checked={permissions.canManage}
                  onCheckedChange={(checked) =>
                    setPermissions((prev) => ({
                      ...prev,
                      canManage: checked === true,
                    }))
                  }
                />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="can-manage" className="cursor-pointer font-medium text-purple-600">
                    Can Manage Room
                  </Label>
                  <p className="text-sm text-gray-500">
                    Allow user to manage room settings and participants (make them
                    a room manager)
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-500">
              💡 Tip: Most participants should have "Can Post" and "Can Edit"
              permissions. Only grant "Can Manage" to trusted coordinators.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!selectedUser}>
              Add Participant
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
