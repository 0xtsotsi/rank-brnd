# Supabase Storage Setup

This document provides instructions for setting up and using Supabase Storage for image uploads in the Rank.brnd application.

## Prerequisites

1. Create a Supabase project at https://supabase.com
2. Create a storage bucket for images
3. Configure environment variables

## Setup Instructions

### 1. Create a Storage Bucket

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"**
4. Configure the bucket:
   - **Name**: `images`
   - **Public bucket**: Enabled (for public access)
   - **File size limit**: 5MB
   - **Allowed MIME types**: `image/jpeg`, `image/png`, `image/gif`, `image/webp`

### 2. Configure Environment Variables

Copy the following environment variables from your Supabase project settings:

1. Go to **Project Settings** → **API**
2. Copy these values to your `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Important**: Never commit `SUPABASE_SERVICE_ROLE_KEY` to version control. It bypasses Row Level Security (RLS).

### 3. Configure Storage Policies (Optional)

For production, configure Row Level Security (RLS) policies:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images');

-- Allow public access to images
CREATE POLICY "Public can view images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'images');

-- Allow users to delete their own images
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## Usage

### Client-Side Upload

```typescript
import { uploadImage } from '@/lib/supabase/storage';

async function handleImageUpload(file: File) {
  try {
    const result = await uploadImage(file, {
      bucket: 'images',
      upsert: false,
    });

    console.log('Image uploaded:', result.publicUrl);
    return result.publicUrl;
  } catch (error) {
    console.error('Upload failed:', error);
  }
}
```

### Server-Side Upload via API

```typescript
async function uploadToServer(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('bucket', 'images');

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  const result = await response.json();

  if (result.success) {
    console.log('Image URL:', result.url);
    return result.url;
  }
}
```

### React Component Example

```tsx
'use client';

import { useState } from 'react';
import { uploadImage } from '@/lib/supabase/storage';

export function ImageUpload() {
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState<string>();

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadImage(file);
      setUrl(result.publicUrl);
    } catch (error) {
      console.error(error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleUpload}
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
      {url && <img src={url} alt="Uploaded" />}
    </div>
  );
}
```

## API Reference

### uploadImage(file, options)

Uploads an image to Supabase Storage from the browser.

**Parameters:**

- `file: File` - The image file to upload
- `options: UploadOptions` (optional)
  - `bucket?: string` - Bucket name (default: 'images')
  - `upsert?: boolean` - Overwrite existing files (default: false)
  - `cacheControl?: string` - Cache control header (default: '3600')
  - `metadata?: Record<string, string>` - Custom metadata

**Returns:** `Promise<UploadResult>`

- `path: string` - Storage path
- `fullPath: string` - Full storage path
- `url: string` - URL (same as publicUrl)
- `publicUrl: string` - Publicly accessible URL

**Throws:** `StorageError`

### uploadImageServer(file, filename, options)

Uploads an image from the server (use in API routes).

**Parameters:**

- `file: File | Buffer` - The image file or buffer
- `filename: string` - Original filename
- `options: UploadOptions` (optional)

**Returns:** `Promise<UploadResult>`

### deleteImage(path, bucket?)

Deletes an image from storage.

**Parameters:**

- `path: string` - Storage path of the image
- `bucket?: string` - Bucket name (default: 'images')

**Returns:** `Promise<void>`

### listUserImages(userId, bucket?)

Lists all images for a specific user.

**Parameters:**

- `userId: string` - User ID
- `bucket?: string` - Bucket name (default: 'images')

**Returns:** `Promise<any[]>` - Array of image metadata

### getImagePublicUrl(path, bucket?)

Gets the public URL for an image.

**Parameters:**

- `path: string` - Storage path
- `bucket?: string` - Bucket name (default: 'images')

**Returns:** `string` - Public URL

## Supported File Types

- `image/jpeg`
- `image/jpg`
- `image/png`
- `image/gif`
- `image/webp`
- `image/svg+xml`

## File Size Limits

- Maximum file size: **5MB**
- Configurable via `MAX_FILE_SIZE` in `lib/supabase/storage.ts`

## Error Handling

All functions throw `StorageError` with descriptive messages:

```typescript
try {
  await uploadImage(file);
} catch (error) {
  if (error instanceof StorageError) {
    switch (error.code) {
      case 'NO_FILE':
        // No file provided
        break;
      case 'UNSUPPORTED_TYPE':
        // Invalid file type
        break;
      case 'FILE_TOO_LARGE':
        // File exceeds size limit
        break;
      case 'UPLOAD_FAILED':
        // Upload operation failed
        break;
    }
  }
}
```

## Security Best Practices

1. **Always validate files on the server** - Client-side validation can be bypassed
2. **Use RLS policies** - Restrict access based on user authentication
3. **Never expose service role key** - Only use on the server
4. **Sanitize filenames** - Prevent path traversal attacks
5. **Set file size limits** - Prevent denial of service
6. **Validate MIME types** - Check both extension and actual file content

## Troubleshooting

### "Missing NEXT_PUBLIC_SUPABASE_URL"

- Ensure `.env.local` exists and contains Supabase credentials
- Restart the development server after adding environment variables

### "Bucket not found"

- Create the bucket in Supabase Storage dashboard
- Verify bucket name matches in code

### "Permission denied"

- Check RLS policies in Supabase
- Verify user is authenticated
- Check service role key is correct (for server operations)

### Upload succeeds but image not accessible

- Ensure bucket is marked as public
- Check RLS policies allow public read access
- Verify the public URL format

## Next Steps

- Set up image transformations (Supabase Image Transformations)
- Implement CDN caching
- Add image compression before upload
- Create image gallery components
- Add bulk upload functionality
