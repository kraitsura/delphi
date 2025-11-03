# Phase 2.4: Media & Attachments

> **Status:** Phase 2.4 - File Uploads & Media
> **Last Updated:** October 31, 2025
> **Prerequisites:** Phase 2.0-2.3 Complete
> **Next:** Phase 2.5 - Multi-User Collaboration

---

## Overview

Enable users to share images, files, and other media in chat. Leverage Convex's built-in storage for seamless file uploads with automatic CDN delivery.

### What You'll Build

- ✅ Image upload to Convex storage
- ✅ Image preview in messages
- ✅ File size validation (5MB limit)
- ✅ Image optimization
- ✅ File attachments (PDFs, docs)
- ✅ Drag & drop upload

---

## Backend Implementation

### 1. Storage Functions

Create `mono/packages/backend/convex/storage.ts`:

```typescript
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserWithRole } from "./authHelpers";

/**
 * Generate upload URL for client-side file upload
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    // Verify authenticated
    await getAuthUserWithRole(ctx);

    // Generate upload URL (expires in 1 hour)
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Get public URL for uploaded file
 */
export const getUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

/**
 * Delete file from storage
 */
export const deleteFile = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const user = await getAuthUserWithRole(ctx);

    // Optional: Verify user owns the file
    // You might want to track file ownership in a separate table

    await ctx.storage.delete(args.storageId);
  },
});
```

### 2. Update Message Schema

Update `mono/packages/backend/convex/schema.ts`:

```typescript
messages: defineTable({
  // ... existing fields

  // Attachments
  attachments: v.optional(v.array(v.object({
    type: v.union(v.literal("image"), v.literal("file")),
    storageId: v.id("_storage"),
    url: v.string(),
    name: v.string(),
    size: v.number(),
    mimeType: v.string(),
  }))),
}),
```

### 3. Enhanced Send Mutation

Update `mono/packages/backend/convex/messages.ts`:

```typescript
export const send = authenticatedMutation(
  async ({ db, user }, args: {
    roomId: Id<"rooms">;
    text: string;
    attachments?: Array<{
      type: "image" | "file";
      storageId: Id<"_storage">;
      name: string;
      size: number;
      mimeType: string;
    }>;
  }) => {
    await requireCanPostInRoom(db as any, args.roomId);

    const userProfile = await db.get(user.id);
    if (!userProfile) throw new Error("User profile not found");

    // Get URLs for attachments
    const enrichedAttachments = args.attachments
      ? await Promise.all(
          args.attachments.map(async (attachment) => {
            const url = await db.storage.getUrl(attachment.storageId);
            return {
              ...attachment,
              url: url || "",
            };
          })
        )
      : undefined;

    const messageId = await db.insert("messages", {
      roomId: args.roomId,
      authorId: user.id,
      text: args.text,
      attachments: enrichedAttachments,
      authorName: userProfile.name,
      authorAvatar: userProfile.avatar,
      isEdited: false,
      isDeleted: false,
      isAIGenerated: false,
      createdAt: Date.now(),
    });

    await db.patch(args.roomId, {
      lastMessageAt: Date.now(),
    });

    return messageId;
  }
);
```

---

## Frontend Implementation

### 1. Image Upload Button

Create `mono/apps/web/src/components/chat/image-upload-button.tsx`:

```typescript
import { useState } from "react";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import { Button } from "@/components/ui/button";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ImageUploadButtonProps {
  onImageUploaded: (storageId: string, url: string, file: File) => void;
}

export function ImageUploadButton({ onImageUploaded }: ImageUploadButtonProps) {
  const [isUploading, setIsUploading] = useState(false);
  const generateUploadUrl = useConvexMutation(api.storage.generateUploadUrl);

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      setIsUploading(true);

      // Step 1: Get upload URL
      const uploadUrl = await generateUploadUrl({});

      // Step 2: Upload file
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = await response.json();

      // Step 3: Get permanent URL
      const url = await fetch(`/api/storage/${storageId}`);

      return { storageId, url: url.toString() };
    },
    onSuccess: ({ storageId, url }, file) => {
      onImageUploaded(storageId, url, file);
      setIsUploading(false);
      toast.success("Image uploaded!");
    },
    onError: (error) => {
      setIsUploading(false);
      toast.error("Failed to upload image");
      console.error(error);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    mutation.mutate(file);
  };

  return (
    <>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        id="image-upload"
      />
      <label htmlFor="image-upload">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={isUploading}
          asChild
        >
          <span>
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
          </span>
        </Button>
      </label>
    </>
  );
}
```

### 2. Image Preview Component

Create `mono/apps/web/src/components/chat/image-preview.tsx`:

```typescript
import Image from "next/image";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImagePreviewProps {
  url: string;
  name: string;
  onRemove?: () => void;
}

export function ImagePreview({ url, name, onRemove }: ImagePreviewProps) {
  return (
    <div className="relative inline-block">
      <Image
        src={url}
        alt={name}
        width={200}
        height={200}
        className="rounded-lg object-cover"
      />
      {onRemove && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute -top-2 -right-2 h-6 w-6"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
```

### 3. Enhanced Message Input with Attachments

Update `mono/apps/web/src/components/chat/message-input.tsx`:

```typescript
import { useState } from "react";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { ImageUploadButton } from "./image-upload-button";
import { ImagePreview } from "./image-preview";

interface Attachment {
  storageId: string;
  url: string;
  name: string;
  size: number;
  type: "image" | "file";
  mimeType: string;
}

interface MessageInputProps {
  roomId: Id<"rooms">;
  currentUserId: Id<"users">;
  currentUserName: string;
}

export function MessageInput({
  roomId,
  currentUserId,
  currentUserName,
}: MessageInputProps) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const sendMessage = useConvexMutation(api.messages.send);

  const mutation = useMutation({
    mutationFn: async () => {
      return await sendMessage({
        roomId,
        text: text || (attachments.length > 0 ? "[Image]" : ""),
        attachments: attachments.map(a => ({
          type: a.type,
          storageId: a.storageId as Id<"_storage">,
          name: a.name,
          size: a.size,
          mimeType: a.mimeType,
        })),
      });
    },
    onSuccess: () => {
      setText("");
      setAttachments([]);
    },
    onError: () => {
      toast.error("Failed to send message");
    },
  });

  const handleImageUploaded = (storageId: string, url: string, file: File) => {
    setAttachments(prev => [
      ...prev,
      {
        storageId,
        url,
        name: file.name,
        size: file.size,
        type: "image",
        mimeType: file.type,
      },
    ]);
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!text.trim() && attachments.length === 0) || mutation.isPending) return;
    mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="border-t p-4">
      {/* Image Previews */}
      {attachments.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {attachments.map((attachment, index) => (
            <ImagePreview
              key={index}
              url={attachment.url}
              name={attachment.name}
              onRemove={() => handleRemoveAttachment(index)}
            />
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <ImageUploadButton onImageUploaded={handleImageUploaded} />

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="min-h-[60px] max-h-[200px] resize-none"
          disabled={mutation.isPending}
        />

        <Button
          type="submit"
          size="icon"
          disabled={(!text.trim() && attachments.length === 0) || mutation.isPending}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
```

### 4. Image Display in Messages

Update `mono/apps/web/src/components/chat/message-item.tsx`:

```typescript
// Add to MessageItem component:

{/* Attachments */}
{message.attachments && message.attachments.length > 0 && (
  <div className="mt-2 flex flex-wrap gap-2">
    {message.attachments.map((attachment, index) => (
      <div key={index}>
        {attachment.type === "image" ? (
          <Image
            src={attachment.url}
            alt={attachment.name}
            width={400}
            height={300}
            className="rounded-lg max-w-full h-auto cursor-pointer"
            onClick={() => {
              // Open lightbox or full-size image
              window.open(attachment.url, "_blank");
            }}
          />
        ) : (
          <a
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2 border rounded hover:bg-muted"
          >
            <FileIcon className="h-4 w-4" />
            <span className="text-sm">{attachment.name}</span>
            <span className="text-xs text-muted-foreground">
              {(attachment.size / 1024).toFixed(1)} KB
            </span>
          </a>
        )}
      </div>
    ))}
  </div>
)}
```

---

## Testing

### Manual Testing Checklist

1. **Image Upload**
   - Click upload → File picker opens
   - Select image → Preview appears
   - Send message → Image displays in chat
   - Other users see image in real-time

2. **Validation**
   - Try non-image file → Error message
   - Try 6MB image → Error message
   - Remove image before sending → Works

3. **Performance**
   - Images load quickly (CDN)
   - Large images optimized
   - Multiple images in message

---

## Success Criteria

- [ ] Can upload images up to 5MB
- [ ] Images display inline in messages
- [ ] Preview before sending works
- [ ] Can remove attachments before sending
- [ ] File size validation works
- [ ] Images load from CDN
- [ ] Click image to view full size

**Phase 2.4 Complete = Rich media sharing!** 📷
