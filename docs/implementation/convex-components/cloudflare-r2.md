# Cloudflare R2 Component Implementation Guide

## Overview

### What It Does
The Cloudflare R2 component provides scalable, cost-effective file storage and serving for our event management application. It integrates Cloudflare's S3-compatible object storage with Convex, enabling:
- Upload and storage of images, documents, and files
- Secure URL generation for file access
- File metadata management
- Client-side direct uploads with signed URLs
- Server-side file storage from actions

### Why We Need It
Our event planning app requires robust file handling for:
- Event images and media (venue photos, inspiration boards)
- Vendor documents (contracts, quotes, invoices)
- Guest attachments (RSVPs, dietary restrictions)
- Message attachments in chat rooms
- Receipt uploads for expense tracking
- Task-related documents and files

Cloudflare R2 offers:
- Zero egress fees (critical for media-heavy apps)
- Global CDN distribution
- S3-compatible API
- More cost-effective than alternatives

### Use Cases in Our App
1. **Message Attachments**: Images and files in room chats
2. **Expense Receipts**: Upload and store receipt photos
3. **Event Media**: Venue photos, mood boards, inspiration images
4. **Vendor Documents**: Contracts, quotes, portfolio images
5. **User Avatars**: Profile pictures for users
6. **Task Attachments**: Files related to event tasks

---

## Installation Steps

### 1. Set Up Cloudflare R2

#### Create R2 Bucket
1. Log in to Cloudflare Dashboard
2. Navigate to R2 Object Storage
3. Create a new bucket (e.g., `delphi-event-files`)
4. Note the bucket name

#### Configure CORS Policy
Add CORS configuration to allow client-side uploads:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3001",
      "https://yourdomain.com"
    ],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

#### Generate API Credentials
1. Go to R2 → Manage R2 API Tokens
2. Create API token with "Edit" permissions
3. Note down:
   - Access Key ID
   - Secret Access Key
   - Endpoint URL (e.g., `https://xxxxx.r2.cloudflarestorage.com`)

### 2. Install Package

```bash
cd /Users/aaryareddy/Projects/delphi/web
npm install @convex-dev/r2
```

### 3. Update Convex Configuration

Edit `convex/convex.config.ts`:

```typescript
import { defineApp } from "convex/server";
import betterAuth from "@convex-dev/better-auth/convex.config";
import presence from "@convex-dev/presence/convex.config";
import r2 from "@convex-dev/r2/convex.config";

const app = defineApp();
app.use(betterAuth);
app.use(presence);
app.use(r2);

export default app;
```

### 4. Set Environment Variables

```bash
npx convex env set R2_TOKEN "your-api-token"
npx convex env set R2_ACCESS_KEY_ID "your-access-key-id"
npx convex env set R2_SECRET_ACCESS_KEY "your-secret-access-key"
npx convex env set R2_ENDPOINT "https://xxxxx.r2.cloudflarestorage.com"
npx convex env set R2_BUCKET "delphi-event-files"
```

For development, also add to `.env.local`:

```env
CONVEX_DEPLOYMENT=dev:your-deployment-name
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

### 5. Run Development Server

```bash
npx convex dev
```

---

## Integration Points

### Where This Component Will Be Used

1. **Message Attachments** (`web/convex/messages.ts`)
   - Upload images/files when sending messages
   - Display attachments in message threads

2. **Expense Receipts** (`web/convex/expenses.ts`)
   - Upload receipt photos
   - Generate secure URLs for viewing

3. **Event Media** (`web/convex/events.ts`)
   - Store event cover images
   - Venue photos and inspiration boards

4. **User Profiles** (`web/convex/users.ts`)
   - Store and serve user avatar images

5. **Task Documents** (`web/convex/tasks.ts`)
   - Attach files to tasks
   - Store vendor quotes and contracts

6. **Vendor Portfolios** 
   - Store vendor portfolio images
   - Previous work examples

---

## Code Examples

### Backend Implementation

Create `web/convex/files.ts`:

```typescript
import { components } from "./_generated/api";
import { R2 } from "@convex-dev/r2";
import { mutation, query, action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUser } from "./authHelpers";

// Initialize R2 component
export const r2 = new R2(components.r2);

/**
 * Generate an upload URL for client-side uploads
 * Includes permission checks and size limits
 */
export const generateUploadUrl = mutation({
  args: {
    fileType: v.union(
      v.literal("image"),
      v.literal("document"),
      v.literal("receipt"),
      v.literal("avatar")
    ),
    contentType: v.string(),
    fileName: v.string(),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Validate file type
    const allowedTypes: Record<string, string[]> = {
      image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
      document: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
      receipt: ["image/jpeg", "image/png", "application/pdf"],
      avatar: ["image/jpeg", "image/png", "image/webp"],
    };

    if (!allowedTypes[args.fileType].includes(args.contentType)) {
      throw new Error(`Invalid content type for ${args.fileType}`);
    }

    // Generate custom key with user context
    const timestamp = Date.now();
    const sanitizedFileName = args.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `${args.fileType}/${userProfile._id}/${timestamp}-${sanitizedFileName}`;

    // Generate upload URL
    const { url, storageId } = await r2.generateUploadUrl(ctx, {
      key,
      type: args.contentType,
    });

    return { url, storageId, key };
  },
});

/**
 * Get a signed URL for file access
 */
export const getFileUrl = query({
  args: {
    fileKey: v.string(),
    expiresIn: v.optional(v.number()), // seconds
  },
  handler: async (ctx, args) => {
    await getAuthenticatedUser(ctx);

    const url = await r2.getUrl(ctx, args.fileKey, {
      expiresIn: args.expiresIn || 3600, // Default: 1 hour
    });

    return url;
  },
});

/**
 * Store file from server-side (e.g., from external API)
 */
export const storeFile = action({
  args: {
    url: v.string(),
    key: v.optional(v.string()),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    await getAuthenticatedUser(ctx);

    // Fetch file from URL
    const response = await fetch(args.url);
    if (!response.ok) {
      throw new Error("Failed to fetch file");
    }

    const blob = await response.blob();

    // Store in R2
    const key = await r2.store(ctx, blob, {
      key: args.key,
      type: args.type,
    });

    return { key };
  },
});

/**
 * Delete a file
 */
export const deleteFile = mutation({
  args: {
    fileKey: v.string(),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Verify ownership (file key includes user ID)
    if (!args.fileKey.includes(userProfile._id)) {
      throw new Error("Unauthorized to delete this file");
    }

    await r2.deleteObject(ctx, args.fileKey);

    return { success: true };
  },
});

/**
 * Get file metadata
 */
export const getFileMetadata = query({
  args: {
    fileKey: v.string(),
  },
  handler: async (ctx, args) => {
    await getAuthenticatedUser(ctx);

    const metadata = await r2.getMetadata(ctx, args.fileKey);

    return metadata;
  },
});

/**
 * List files for a user
 */
export const listUserFiles = query({
  args: {
    userId: v.optional(v.id("users")),
    fileType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);
    const userId = args.userId || userProfile._id;

    // Build prefix for filtering
    const prefix = args.fileType 
      ? `${args.fileType}/${userId}/` 
      : `${userId}/`;

    const files = await r2.listMetadata(ctx, {
      prefix,
      limit: args.limit || 100,
    });

    return files;
  },
});

/**
 * Handle post-upload processing
 * Called automatically by R2 component after successful upload
 */
export const onUploadComplete = internalMutation({
  args: {
    fileKey: v.string(),
    storageId: v.string(),
    metadata: v.any(),
  },
  handler: async (ctx, args) => {
    // Optional: Store file reference in your database
    // Optional: Run virus scanning
    // Optional: Generate thumbnails for images
    // Optional: Update user storage quota

    console.log(`File uploaded: ${args.fileKey}`);
  },
});
```

### Message Attachments Integration

Update `web/convex/messages.ts` to support file attachments:

```typescript
import { r2 } from "./files";

export const sendWithAttachment = mutation({
  args: {
    roomId: v.id("rooms"),
    text: v.string(),
    attachmentKey: v.optional(v.string()),
    attachmentType: v.optional(v.union(v.literal("image"), v.literal("file"))),
    attachmentName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);
    await requireCanPostInRoom(ctx, args.roomId, userProfile._id);

    // Get attachment metadata if provided
    let attachments = undefined;
    if (args.attachmentKey) {
      const metadata = await r2.getMetadata(ctx, args.attachmentKey);
      
      attachments = [{
        type: args.attachmentType!,
        url: args.attachmentKey, // Store key, not URL
        name: args.attachmentName!,
        size: metadata?.ContentLength || 0,
      }];
    }

    // Create message with attachment
    const messageId = await ctx.db.insert("messages", {
      roomId: args.roomId,
      authorId: userProfile._id,
      text: args.text,
      attachments,
      isEdited: false,
      isDeleted: false,
      isAIGenerated: false,
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.roomId, {
      lastMessageAt: Date.now(),
    });

    return messageId;
  },
});
```

### Frontend Hook

Create `web/src/hooks/useFileUpload.ts`:

```typescript
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

export type FileType = "image" | "document" | "receipt" | "avatar";

interface UploadOptions {
  fileType: FileType;
  maxSizeMB?: number;
  onSuccess?: (fileKey: string) => void;
  onError?: (error: Error) => void;
}

export function useFileUpload(options: UploadOptions) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const uploadFile = async (file: File) => {
    // Validate file size
    const maxSize = (options.maxSizeMB || 10) * 1024 * 1024;
    if (file.size > maxSize) {
      const error = new Error(`File size exceeds ${options.maxSizeMB || 10}MB limit`);
      options.onError?.(error);
      toast.error(error.message);
      return null;
    }

    try {
      setUploading(true);
      setProgress(10);

      // Generate upload URL
      const { url, storageId, key } = await generateUploadUrl({
        fileType: options.fileType,
        contentType: file.type,
        fileName: file.name,
      });

      setProgress(30);

      // Upload file to R2
      const response = await fetch(url, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      setProgress(100);
      options.onSuccess?.(key);
      toast.success("File uploaded successfully");

      return { key, storageId };
    } catch (error) {
      const err = error as Error;
      options.onError?.(err);
      toast.error(err.message || "Upload failed");
      return null;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return {
    uploadFile,
    uploading,
    progress,
  };
}
```

### React Component Example

Create `web/src/components/files/FileUploadButton.tsx`:

```typescript
import { useRef } from "react";
import { useFileUpload, FileType } from "@/hooks/useFileUpload";
import { Button } from "@/components/ui/button";
import { Paperclip, Loader2 } from "lucide-react";

interface FileUploadButtonProps {
  fileType: FileType;
  onUploadComplete: (fileKey: string) => void;
  accept?: string;
  maxSizeMB?: number;
  children?: React.ReactNode;
}

export function FileUploadButton({
  fileType,
  onUploadComplete,
  accept = "*/*",
  maxSizeMB = 10,
  children,
}: FileUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { uploadFile, uploading, progress } = useFileUpload({
    fileType,
    maxSizeMB,
    onSuccess: onUploadComplete,
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
      // Reset input
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileSelect}
        disabled={uploading}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            {progress}%
          </>
        ) : (
          <>
            <Paperclip className="h-4 w-4 mr-2" />
            {children || "Attach File"}
          </>
        )}
      </Button>
    </>
  );
}
```

### Image Display Component

Create `web/src/components/files/SecureImage.tsx`:

```typescript
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Loader2 } from "lucide-react";
import { useState } from "react";

interface SecureImageProps {
  fileKey: string;
  alt: string;
  className?: string;
  expiresIn?: number;
}

export function SecureImage({ 
  fileKey, 
  alt, 
  className,
  expiresIn = 3600 
}: SecureImageProps) {
  const [error, setError] = useState(false);
  
  const url = useQuery(api.files.getFileUrl, { 
    fileKey, 
    expiresIn 
  });

  if (!url) {
    return (
      <div className="flex items-center justify-center bg-muted">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center bg-muted text-sm text-muted-foreground">
        Failed to load image
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      onError={() => setError(true)}
    />
  );
}
```

---

## Configuration

### Environment Variables

**Required (Production):**
```env
R2_TOKEN=your-api-token
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_ENDPOINT=https://xxxxx.r2.cloudflarestorage.com
R2_BUCKET=delphi-event-files
```

**Optional (Development):**
```env
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

### Bucket Configuration

**CORS Settings:**
- Allow origins: Your production domain + localhost
- Allow methods: GET, PUT, POST
- Allow headers: * (or specific headers)
- Max age: 3600 seconds

**Lifecycle Rules:**
Consider adding rules to automatically delete:
- Incomplete multipart uploads after 7 days
- Temporary files after 30 days
- Old receipts after 7 years (legal requirement)

### File Size Limits

Adjust in frontend hook and backend validation:

```typescript
const FILE_SIZE_LIMITS = {
  image: 10 * 1024 * 1024,      // 10 MB
  document: 50 * 1024 * 1024,   // 50 MB
  receipt: 10 * 1024 * 1024,    // 10 MB
  avatar: 5 * 1024 * 1024,      // 5 MB
};
```

---

## Best Practices

### 1. Security

**Generate Custom Keys:**
```typescript
const key = `${fileType}/${userId}/${timestamp}-${sanitizedFileName}`;
```

**Validate File Types:**
```typescript
const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
if (!allowedTypes.includes(contentType)) {
  throw new Error("Invalid file type");
}
```

**Check Ownership Before Deletion:**
```typescript
if (!fileKey.includes(userProfile._id)) {
  throw new Error("Unauthorized");
}
```

### 2. Performance

**Use Signed URLs with Expiration:**
```typescript
const url = await r2.getUrl(ctx, fileKey, {
  expiresIn: 3600, // 1 hour
});
```

**Lazy Load Images:**
```typescript
<img loading="lazy" src={url} />
```

**Generate Thumbnails:**
Consider using Cloudflare Images or a serverless function to generate thumbnails.

### 3. Storage Optimization

**Compress Images Client-Side:**
Use a library like `browser-image-compression` before upload.

**Clean Up Unused Files:**
```typescript
// Periodic cleanup job
export const cleanupOrphanedFiles = internalMutation({
  handler: async (ctx) => {
    // Find files not referenced in any message/expense/etc.
    // Delete them from R2
  },
});
```

### 4. User Experience

**Show Upload Progress:**
```typescript
<Progress value={progress} />
```

**Preview Before Upload:**
```typescript
const preview = URL.createObjectURL(file);
```

**Handle Upload Errors Gracefully:**
```typescript
toast.error("Upload failed. Please try again.");
```

---

## Migration Plan

### Phase 1: Infrastructure Setup (Week 1)
1. Create R2 bucket and configure CORS
2. Generate API credentials
3. Install package and configure Convex
4. Set environment variables
5. Test basic upload/download

### Phase 2: Backend Implementation (Week 1-2)
1. Create `convex/files.ts` with R2 wrapper
2. Add upload URL generation
3. Add file metadata queries
4. Add delete functionality
5. Write backend tests

### Phase 3: Frontend Hooks (Week 2)
1. Create `useFileUpload` hook
2. Add progress tracking
3. Add error handling
4. Test in isolation

### Phase 4: UI Components (Week 2-3)
1. Create `FileUploadButton` component
2. Create `SecureImage` component
3. Add file preview components
4. Style with design system

### Phase 5: Integration (Week 3-4)
1. Add to message attachments
2. Add to expense receipts
3. Add to user avatars
4. Add to event media
5. Integration testing

### Phase 6: Optimization (Week 4)
1. Implement image compression
2. Add thumbnail generation
3. Set up CDN caching
4. Performance testing

---

## Testing Strategy

### Unit Tests

```typescript
// Test upload URL generation
test("generateUploadUrl requires authentication", async () => {
  // Test that unauthenticated users can't generate URLs
});

test("generateUploadUrl validates file types", async () => {
  // Test that invalid file types are rejected
});

// Test file deletion
test("deleteFile checks ownership", async () => {
  // Test that users can only delete their own files
});
```

### Integration Tests

1. **Upload Flow**: Upload a file, verify it appears in R2
2. **Download Flow**: Generate URL, fetch file, verify content
3. **Delete Flow**: Delete file, verify it's removed from R2
4. **Message Attachment**: Upload file, attach to message, verify it displays

### Manual Testing Checklist

- [ ] Upload various file types (JPEG, PNG, PDF)
- [ ] Upload files of different sizes
- [ ] Verify upload progress indication
- [ ] Test file size limit enforcement
- [ ] Test file type validation
- [ ] Download and verify file content
- [ ] Delete file and verify removal
- [ ] Test with slow network (throttling)
- [ ] Test concurrent uploads
- [ ] Verify secure URLs expire correctly
- [ ] Test error scenarios (network failure, invalid file)

### Performance Testing

- Upload 100+ files sequentially
- Upload 10 files concurrently
- Load page with 50+ images
- Measure time to generate signed URLs
- Monitor R2 bandwidth and storage costs

---

## Security Considerations

### 1. File Type Validation

**Backend Validation:**
```typescript
const ALLOWED_TYPES = {
  image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  document: ["application/pdf"],
};
```

**Frontend Validation:**
```typescript
accept=".jpg,.jpeg,.png,.gif,.webp"
```

**MIME Type Verification:**
Consider using a library like `file-type` to verify actual file content, not just extension.

### 2. Access Control

**Generate User-Specific Keys:**
```typescript
const key = `${fileType}/${userId}/${timestamp}-${sanitizedFileName}`;
```

**Check Permissions Before URL Generation:**
```typescript
// For message attachments
const message = await ctx.db.get(messageId);
await requireRoomParticipant(ctx, message.roomId, userProfile._id);
```

### 3. Signed URLs

Always use expiring signed URLs, never public URLs for sensitive content:

```typescript
const url = await r2.getUrl(ctx, fileKey, {
  expiresIn: 3600, // 1 hour
});
```

### 4. Rate Limiting

Prevent abuse by rate limiting uploads:

```typescript
// Use rate limiter component
await rateLimiter.limit(ctx, "fileUpload", {
  key: userProfile._id,
  count: 1,
});
```

### 5. Malware Scanning

Consider integrating a malware scanning service:

```typescript
export const scanFile = action({
  handler: async (ctx, args) => {
    // Integrate with ClamAV or cloud service
    // Quarantine suspicious files
  },
});
```

---

## Cost Optimization

### Cloudflare R2 Pricing (as of 2024)

- **Storage**: $0.015/GB/month
- **Class A Operations** (writes): $4.50 per million
- **Class B Operations** (reads): $0.36 per million
- **Egress**: FREE (major advantage over S3)

### Optimization Strategies

1. **Compress Images**: Use WebP format, compress before upload
2. **Cache URLs**: Cache signed URLs client-side for their duration
3. **Lazy Loading**: Only load images when visible
4. **Thumbnail Generation**: Store/serve smaller versions for lists
5. **CDN Integration**: Use Cloudflare CDN for caching
6. **Lifecycle Rules**: Auto-delete old temporary files

### Storage Quotas

Consider implementing per-user storage quotas:

```typescript
export const checkStorageQuota = async (ctx: any, userId: Id<"users">) => {
  const files = await r2.listMetadata(ctx, {
    prefix: `${userId}/`,
  });
  
  const totalSize = files.reduce((sum, f) => sum + (f.ContentLength || 0), 0);
  const quotaMB = 100; // 100 MB per user
  
  if (totalSize > quotaMB * 1024 * 1024) {
    throw new Error("Storage quota exceeded");
  }
};
```

---

## Common Issues & Troubleshooting

### Issue: CORS errors on upload
**Solution**: Verify CORS configuration in R2 bucket settings. Ensure your domain is in AllowedOrigins.

### Issue: 403 Forbidden on URL access
**Solution**: Check that signed URL hasn't expired. Verify R2 credentials are correct.

### Issue: Large file uploads fail
**Solution**: Implement multipart upload for files > 100MB. Increase timeout limits.

### Issue: Slow image loading
**Solution**: Implement CDN caching, generate thumbnails, use WebP format.

### Issue: Files not deleting
**Solution**: Verify key matches exactly (case-sensitive). Check R2 permissions.

---

## Future Enhancements

1. **Image Processing**
   - Automatic thumbnail generation
   - Format conversion (WebP)
   - Compression optimization

2. **Advanced Features**
   - Multi-file upload with drag-and-drop
   - Image cropping/editing before upload
   - Video upload support with transcoding

3. **Analytics**
   - Track storage usage per user/event
   - Monitor popular files
   - Generate cost reports

4. **Backup & Recovery**
   - Automated backups to secondary storage
   - File versioning
   - Soft delete with recovery period

5. **CDN Optimization**
   - Cloudflare Images integration
   - Automatic format optimization
   - Responsive images

---

## References

- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)
- [Convex R2 Component](https://www.convex.dev/components/cloudflare-r2)
- [Convex Components Reference](../../../llm_docs/convex_components_reference.md)
- [S3 API Compatibility](https://developers.cloudflare.com/r2/api/s3/)
