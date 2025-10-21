# File Upload Service

A complete file upload service built with Encore.ts that provides file storage, shareable links, and automatic cleanup of old files.

## Features

- **File Upload**: Upload files with metadata tracking
- **Object Storage**: Files are stored in an Encore object storage bucket
- **Shareable Links**: Generate unique, shareable links for each uploaded file
- **Automatic Cleanup**: Cronjob runs daily to delete files older than 30 days
- **Download Tracking**: Track download counts for each file
- **File Management**: List, download, and delete files via API

## API Endpoints

### 1. Upload a File

**POST** `/files/upload`

Upload a new file to the service.

**Request:**
```json
{
  "fileName": "document.pdf",
  "fileSize": 1024000,
  "mimeType": "application/pdf",
  "fileData": "base64-encoded-file-content",
  "uploadedBy": "user@example.com",
  "isPublic": false
}
```

**Response:**
```json
{
  "id": "abc123...",
  "fileName": "document.pdf",
  "fileSize": 1024000,
  "shareToken": "xyz789...",
  "shareUrl": "http://localhost:4001/files/share/xyz789...",
  "uploadedAt": "2025-10-21T10:30:00.000Z"
}
```

### 2. Download a File

**GET** `/files/download?id=abc123` or `/files/download?shareToken=xyz789`

Download a file by ID or share token.

**Response:**
```json
{
  "fileName": "document.pdf",
  "fileData": "base64-encoded-file-content",
  "mimeType": "application/pdf"
}
```

### 3. Get Share Link

**GET** `/files/:id/share`

Get the shareable link for a file.

**Response:**
```json
{
  "shareUrl": "http://localhost:4001/files/share/xyz789...",
  "shareToken": "xyz789..."
}
```

### 4. Download via Share Link

**GET** `/files/share/:token`

Download a file directly using its share token. Returns the file as a binary download.

### 5. List Files

**GET** `/files?uploadedBy=user@example.com&limit=50&offset=0`

List uploaded files with optional filtering and pagination.

**Response:**
```json
{
  "files": [
    {
      "id": "abc123...",
      "fileName": "document.pdf",
      "fileSize": 1024000,
      "mimeType": "application/pdf",
      "uploadedBy": "user@example.com",
      "uploadedAt": "2025-10-21T10:30:00.000Z",
      "downloadCount": 5
    }
  ],
  "total": 42
}
```

### 6. Delete a File

**DELETE** `/files/:id`

Delete a file by ID.

**Response:**
```json
{
  "success": true
}
```

## Database Schema

The service uses a `uploaded_files` table with the following structure:

- `id` - Unique file identifier
- `fileName` - Original file name
- `fileSize` - File size in bytes
- `mimeType` - MIME type of the file
- `storageKey` - Key used to store the file in object storage
- `uploadedBy` - Optional user identifier
- `uploadedAt` - Upload timestamp
- `expiresAt` - Expiration date (30 days from upload)
- `shareToken` - Unique token for sharing
- `isPublic` - Whether the file is publicly accessible
- `downloadCount` - Number of times the file has been downloaded

## Automatic Cleanup

A cronjob runs daily at 2:00 AM to clean up expired files:

- Finds all files where `expiresAt < now`
- Deletes files from object storage
- Removes database records
- Logs cleanup statistics

## Setup

1. **Generate migrations:**
   ```bash
   npm run db:generate:files
   ```

2. **Apply migrations** (the migrations will be applied automatically when you run `encore run`):
   ```bash
   encore run
   ```

3. **Access the API:**
   - Base URL: `http://localhost:4001`
   - API endpoints are available at `/files/*`

## Storage

Files are stored in an Encore object storage bucket named `files`. The bucket is automatically provisioned when you run the service.

## Development

- **Database Studio:** View and edit data in the browser
  ```bash
  npm run db:studio:files
  ```

- **Push Schema:** Push schema changes directly to the database
  ```bash
  npm run db:push:files
  ```

## Notes

- Files are automatically set to expire 30 days after upload
- The `FILES_DATABASE_URL` environment variable is used for the database connection (automatically set by Encore)
- All files are tracked in a separate database from the auth service
- Share tokens are cryptographically random and URL-safe
