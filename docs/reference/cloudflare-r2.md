# Cloudflare R2: Complete Storage Guide

## Overview

Cloudflare R2 Storage is an **S3-compatible object storage** service that allows developers to store large amounts of unstructured data **without costly egress bandwidth fees**. R2 provides the same APIs as Amazon S3, making migration simple while offering significant cost savings.

**Key Value Proposition:** Zero egress fees + S3 compatibility = massive cost savings for high-bandwidth applications.

## What is R2?

Cloudflare R2 is:
- **S3-Compatible**: Works with existing S3 tools and libraries
- **Zero Egress Fees**: No charges for data retrieval
- **Global Distribution**: Built on Cloudflare's global network
- **Predictable Pricing**: Simple, transparent cost structure
- **Fully Managed**: No infrastructure to maintain

### R2 vs AWS S3 Comparison

| Feature | Cloudflare R2 | AWS S3 |
|---------|--------------|---------|
| **Egress Fees** | $0 | $0.09/GB (can be higher) |
| **Storage** | $0.015/GB/month | $0.023/GB/month |
| **Class A Operations** | $4.50/million | $5.00/million |
| **Class B Operations** | $0.36/million | $0.40/million |
| **S3 API Compatibility** | ✅ Yes | ✅ Native |
| **Global Replication** | Automatic | Manual/costly |
| **Use Case** | High egress workloads | AWS ecosystem apps |

**When R2 Saves 99% of costs:**
- Media streaming and delivery
- Large file downloads
- CDN asset storage
- Video-on-demand services
- Backup storage with frequent retrieval

**When S3 May Be Better:**
- Deep AWS integration needed
- Complex lifecycle policies required
- Existing AWS infrastructure
- Data lake/analytics workloads

## Setup & Installation

### Prerequisites

- Cloudflare account
- Node.js (for local development)
- Wrangler CLI (optional, for Workers)

### Step 1: Purchase R2

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **R2** in the sidebar
3. Click **Purchase R2**
4. Accept the pricing terms

**Note:** R2 has a generous free tier:
- 10 GB storage/month
- 1 million Class A operations/month
- 10 million Class B operations/month

### Step 2: Create a Bucket

#### Via Dashboard

1. Go to **R2** → **Create bucket**
2. Enter a bucket name (globally unique)
3. Select location hint (optional)
4. Click **Create bucket**

#### Via Wrangler CLI

```bash
# Install Wrangler
npm install -g wrangler

# Login
wrangler login

# Create bucket
wrangler r2 bucket create my-bucket

# List buckets
wrangler r2 bucket list
```

### Step 3: Generate API Tokens

For S3 API access, you need API credentials.

#### Via Dashboard

1. Go to **R2** → **Manage R2 API Tokens**
2. Click **Create API token**
3. Configure permissions:
   - **Admin Read & Write**: Full access
   - **Object Read & Write**: Access objects only
   - **Object Read only**: Read-only access
4. Optionally scope to specific buckets
5. Click **Create API Token**
6. **Save credentials** (shown only once):
   - Access Key ID
   - Secret Access Key
   - Endpoint URL

**Example credentials:**
```
Access Key ID: f65a0c2b6e8d4e3f9a1b2c3d4e5f6a7b
Secret Access Key: 1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b
Endpoint: https://1234567890abcdef.r2.cloudflarestorage.com
```

## Access Methods

R2 provides three ways to access data:

### 1. R2 Workers Binding API (Recommended for Workers)

Direct access from Cloudflare Workers with no authentication needed.

**wrangler.toml configuration:**
```toml
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2025-01-01"

[[r2_buckets]]
binding = "MY_BUCKET"
bucket_name = "my-bucket"
```

**Worker code:**
```typescript
export interface Env {
  MY_BUCKET: R2Bucket
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Upload object
    await env.MY_BUCKET.put('file.txt', 'Hello, R2!')

    // Get object
    const object = await env.MY_BUCKET.get('file.txt')
    if (object === null) {
      return new Response('Not found', { status: 404 })
    }

    // Return object body
    return new Response(object.body)
  },
}
```

### 2. S3 API (Standard HTTP API)

Use any S3-compatible library with R2's S3-compatible endpoint.

**Configuration:**
```javascript
const endpoint = 'https://ACCOUNT_ID.r2.cloudflarestorage.com'
const accessKeyId = 'YOUR_ACCESS_KEY_ID'
const secretAccessKey = 'YOUR_SECRET_ACCESS_KEY'
const region = 'auto' // Always 'auto' for R2
```

### 3. Public Buckets

Expose buckets publicly via custom domains.

#### Enable Public Access

1. Go to bucket settings
2. Click **Allow Access** under Public Access
3. Connect custom domain or use `r2.dev` subdomain

**Example:**
- R2 dev domain: `https://pub-1234567890abcdef.r2.dev/file.txt`
- Custom domain: `https://assets.example.com/file.txt`

## Using the Workers Binding API

The Workers Binding API provides the most performant access to R2.

### Upload Objects

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Simple upload
    await env.MY_BUCKET.put('simple.txt', 'Hello, World!')

    // Upload with metadata
    await env.MY_BUCKET.put('document.pdf', pdfData, {
      httpMetadata: {
        contentType: 'application/pdf',
        cacheControl: 'max-age=3600',
        contentDisposition: 'attachment; filename="document.pdf"',
      },
      customMetadata: {
        uploadedBy: 'user-123',
        version: '1.0',
      },
    })

    // Upload stream
    await env.MY_BUCKET.put('large-file.bin', request.body, {
      httpMetadata: {
        contentType: 'application/octet-stream',
      },
    })

    return new Response('Uploaded', { status: 200 })
  },
}
```

### Get Objects

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const key = url.pathname.slice(1)

    // Get object
    const object = await env.MY_BUCKET.get(key)

    if (object === null) {
      return new Response('Not found', { status: 404 })
    }

    // Return with metadata
    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata.contentType || 'application/octet-stream',
        'ETag': object.etag,
        'Cache-Control': object.httpMetadata.cacheControl || '',
      },
    })
  },
}
```

### List Objects

```typescript
// List all objects
const listed = await env.MY_BUCKET.list()
for (const object of listed.objects) {
  console.log(object.key, object.size, object.uploaded)
}

// List with prefix
const prefixed = await env.MY_BUCKET.list({
  prefix: 'images/',
  limit: 100,
})

// Pagination
let cursor: string | undefined
do {
  const result = await env.MY_BUCKET.list({
    cursor,
    limit: 1000,
  })

  for (const object of result.objects) {
    console.log(object.key)
  }

  cursor = result.truncated ? result.cursor : undefined
} while (cursor)
```

### Delete Objects

```typescript
// Delete single object
await env.MY_BUCKET.delete('file.txt')

// Delete multiple objects
await env.MY_BUCKET.delete(['file1.txt', 'file2.txt', 'file3.txt'])
```

## Using the S3 API

R2 is S3-compatible, so you can use the AWS SDK.

### Node.js / TypeScript with AWS SDK v3

**Install dependencies:**
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

**Basic setup:**
```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'

const S3 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
})

// Upload file
async function uploadFile(bucket: string, key: string, body: Buffer) {
  await S3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: 'image/png',
  }))
}

// Download file
async function downloadFile(bucket: string, key: string) {
  const response = await S3.send(new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  }))

  return response.Body
}

// List objects
import { ListObjectsV2Command } from '@aws-sdk/client-s3'

async function listObjects(bucket: string, prefix?: string) {
  const response = await S3.send(new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix,
    MaxKeys: 1000,
  }))

  return response.Contents || []
}

// Delete object
import { DeleteObjectCommand } from '@aws-sdk/client-s3'

async function deleteFile(bucket: string, key: string) {
  await S3.send(new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  }))
}
```

### Presigned URLs

Generate temporary URLs for client-side uploads/downloads.

```typescript
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'

// Presigned upload URL (for client-side upload)
async function createUploadUrl(bucket: string, key: string, expiresIn = 3600) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
  })

  const url = await getSignedUrl(S3, command, { expiresIn })
  return url
}

// Presigned download URL
async function createDownloadUrl(bucket: string, key: string, expiresIn = 3600) {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  })

  const url = await getSignedUrl(S3, command, { expiresIn })
  return url
}

// Usage in API route
app.post('/api/upload-url', async (req, res) => {
  const { filename } = req.body
  const url = await createUploadUrl('my-bucket', `uploads/${filename}`)

  res.json({ uploadUrl: url })
})

// Client-side usage
const response = await fetch('/api/upload-url', {
  method: 'POST',
  body: JSON.stringify({ filename: 'photo.jpg' }),
})
const { uploadUrl } = await response.json()

// Upload directly to R2
await fetch(uploadUrl, {
  method: 'PUT',
  body: fileData,
  headers: {
    'Content-Type': 'image/jpeg',
  },
})
```

### Python with Boto3

```python
import boto3

s3 = boto3.client('s3',
    endpoint_url=f'https://{ACCOUNT_ID}.r2.cloudflarestorage.com',
    aws_access_key_id=ACCESS_KEY_ID,
    aws_secret_access_key=SECRET_ACCESS_KEY,
    region_name='auto'
)

# Upload file
s3.upload_file('local-file.txt', 'my-bucket', 'remote-file.txt')

# Download file
s3.download_file('my-bucket', 'remote-file.txt', 'downloaded.txt')

# List objects
response = s3.list_objects_v2(Bucket='my-bucket', Prefix='uploads/')
for obj in response.get('Contents', []):
    print(obj['Key'], obj['Size'])

# Delete file
s3.delete_object(Bucket='my-bucket', Key='remote-file.txt')
```

## Integration with TanStack Start

### Server Function for Upload

```typescript
// app/server/r2.ts
import { createServerFn } from '@tanstack/start'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const S3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export const getUploadUrl = createServerFn('POST', async (data: {
  filename: string
  contentType: string
}) => {
  const key = `uploads/${Date.now()}-${data.filename}`

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: data.contentType,
  })

  const uploadUrl = await getSignedUrl(S3, command, { expiresIn: 3600 })

  return { uploadUrl, key }
})

export const getDownloadUrl = createServerFn('GET', async (key: string) => {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  })

  const downloadUrl = await getSignedUrl(S3, command, { expiresIn: 3600 })

  return { downloadUrl }
})
```

### Component for File Upload

```typescript
// app/components/FileUpload.tsx
import { useState } from 'react'
import { getUploadUrl } from '../server/r2'

export function FileUpload() {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleUpload(file: File) {
    setUploading(true)
    setError(null)

    try {
      // Get presigned upload URL
      const { uploadUrl, key } = await getUploadUrl({
        filename: file.name,
        contentType: file.type,
      })

      // Upload directly to R2
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      // Save key to database (using Convex)
      await convex.mutation(api.files.create, {
        key,
        filename: file.name,
        contentType: file.type,
        size: file.size,
      })

      alert('Upload successful!')
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <input
        type="file"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleUpload(file)
        }}
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
      {error && <p>Error: {error}</p>}
    </div>
  )
}
```

## Integration with Convex

Store file metadata in Convex, files in R2.

### Convex Schema

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  files: defineTable({
    key: v.string(),           // R2 object key
    filename: v.string(),
    contentType: v.string(),
    size: v.number(),
    uploadedBy: v.id('users'),
    uploadedAt: v.number(),
    publicUrl: v.optional(v.string()),
  })
    .index('by_user', ['uploadedBy'])
    .index('by_key', ['key']),
})
```

### Convex Mutations

```typescript
// convex/files.ts
import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const create = mutation({
  args: {
    key: v.string(),
    filename: v.string(),
    contentType: v.string(),
    size: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Unauthorized')

    return await ctx.db.insert('files', {
      key: args.key,
      filename: args.filename,
      contentType: args.contentType,
      size: args.size,
      uploadedBy: user.subject as any,
      uploadedAt: Date.now(),
    })
  },
})

export const list = query({
  handler: async (ctx) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Unauthorized')

    return await ctx.db
      .query('files')
      .withIndex('by_user', (q) => q.eq('uploadedBy', user.subject as any))
      .order('desc')
      .collect()
  },
})

export const remove = mutation({
  args: { id: v.id('files') },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Unauthorized')

    const file = await ctx.db.get(args.id)
    if (!file) throw new Error('File not found')
    if (file.uploadedBy !== user.subject) throw new Error('Unauthorized')

    await ctx.db.delete(args.id)

    // Note: Also delete from R2 via server function
    return { key: file.key }
  },
})
```

## Best Practices

### 1. Use Presigned URLs for Client Uploads

Avoid uploading through your backend:

**❌ Bad: Upload through backend**
```typescript
// Client uploads to your server (bandwidth cost + slower)
const formData = new FormData()
formData.append('file', file)
await fetch('/api/upload', { method: 'POST', body: formData })
```

**✅ Good: Direct upload to R2**
```typescript
// Client uploads directly to R2 (fast + free)
const { uploadUrl } = await fetch('/api/upload-url').then(r => r.json())
await fetch(uploadUrl, { method: 'PUT', body: file })
```

### 2. Set Appropriate Cache Headers

```typescript
await env.MY_BUCKET.put('image.jpg', imageData, {
  httpMetadata: {
    contentType: 'image/jpeg',
    cacheControl: 'public, max-age=31536000, immutable', // 1 year
  },
})
```

### 3. Use Object Prefixes for Organization

```
my-bucket/
  ├── users/
  │   ├── user-123/
  │   │   ├── avatar.jpg
  │   │   └── documents/
  │   └── user-456/
  ├── uploads/
  │   ├── 2025/
  │   │   ├── 01/
  │   │   └── 02/
  └── static/
      ├── images/
      └── videos/
```

## Use Cases

### Ideal For:

1. **Media delivery** - Images, videos, audio
2. **CDN assets** - CSS, JS, fonts
3. **User uploads** - Profile pictures, documents
4. **Backups** - Database backups, application backups
5. **Video streaming** - VOD, live archives
6. **Static site hosting** - Combined with Pages
7. **Data lakes** - Analytics data storage
8. **File sharing** - Presigned URL sharing

### Cost Savings Examples:

**Video streaming service:**
- 1 TB egress/month on S3: ~$92
- 1 TB egress/month on R2: $0
- **Savings: $92/month = $1,104/year**

**Media website:**
- 10 TB egress/month on S3: ~$920
- 10 TB egress/month on R2: $0
- **Savings: $920/month = $11,040/year**

## Resources

- **Official Docs**: [developers.cloudflare.com/r2](https://developers.cloudflare.com/r2/)
- **API Reference**: [developers.cloudflare.com/r2/api](https://developers.cloudflare.com/r2/api/)
- **Pricing**: [cloudflare.com/plans/developer-platform](https://www.cloudflare.com/plans/developer-platform/)
- **Status**: [cloudflarestatus.com](https://www.cloudflarestatus.com/)

## Summary

Cloudflare R2 offers:

- **Zero egress fees** - Massive savings for high-bandwidth applications
- **S3 compatibility** - Easy migration with existing tools
- **Simple pricing** - Predictable costs without surprises
- **Global performance** - Built on Cloudflare's edge network
- **Easy integration** - Works with Workers, TanStack Start, and Convex

Perfect for media delivery, user uploads, backups, CDN assets, and any application that serves large amounts of data to users. The combination of R2 for file storage + Convex for metadata creates a powerful, cost-effective storage solution.
