# Team Messaging Service

A complete team messaging service built with Encore.ts, featuring real-time messaging, file uploads, and automatic cleanup.

## Features

### 1. Team & Channel Management
- Create teams to organize users
- Create channels within teams for focused conversations
- Join/leave channels
- Role-based access (admin, member)

### 2. Real-time Messaging
- Send and receive messages in channels
- View message history with pagination
- Soft delete support for messages
- User information attached to each message

### 3. File Storage
- Upload files to messages
- Automatic storage in Encore's object storage
- Download files securely
- Supports any file type with MIME type tracking

### 4. Pub/Sub for New Messages
- Real-time message notifications via Encore's pub/sub
- Extensible subscriber system for webhooks, notifications, etc.
- At-least-once delivery guarantee

### 5. Automatic File Cleanup
- Cron job runs daily at 2 AM
- Automatically deletes files older than 90 days
- Removes files from both storage and database
- Configurable retention period

## Database Schema

### Tables
- **team** - Team organizations
- **channel** - Channels within teams
- **channelMember** - User membership in channels
- **message** - Chat messages
- **fileAttachment** - File metadata and storage references

All tables include proper foreign key relationships with cascade deletes.

## API Endpoints

### Team Management

#### Create Team
```
POST /teams
Authorization: <user-id>

Request:
{
  "name": "Engineering Team",
  "description": "All engineering discussions"
}

Response:
{
  "id": "uuid",
  "name": "Engineering Team",
  "description": "All engineering discussions",
  "createdAt": "2025-10-21T00:00:00Z"
}
```

#### List Teams
```
GET /teams

Response:
{
  "teams": [
    {
      "id": "uuid",
      "name": "Engineering Team",
      "description": "All engineering discussions",
      "createdAt": "2025-10-21T00:00:00Z"
    }
  ]
}
```

### Channel Management

#### Create Channel
```
POST /channels
Authorization: <user-id>

Request:
{
  "name": "general",
  "description": "General discussions",
  "teamId": "team-uuid"
}

Response:
{
  "id": "uuid",
  "name": "general",
  "description": "General discussions",
  "teamId": "team-uuid",
  "createdAt": "2025-10-21T00:00:00Z"
}
```

#### List Channels
```
GET /teams/:teamId/channels

Response:
{
  "channels": [
    {
      "id": "uuid",
      "name": "general",
      "description": "General discussions",
      "teamId": "team-uuid",
      "createdAt": "2025-10-21T00:00:00Z"
    }
  ]
}
```

#### Join Channel
```
POST /channels/:channelId/join
Authorization: <user-id>

Response:
{
  "success": true,
  "message": "Successfully joined channel"
}
```

### Messaging

#### Send Message
```
POST /messages
Authorization: <user-id>

Request:
{
  "channelId": "channel-uuid",
  "content": "Hello, team!"
}

Response:
{
  "id": "uuid",
  "content": "Hello, team!",
  "channelId": "channel-uuid",
  "userId": "user-uuid",
  "userName": "John Doe",
  "createdAt": "2025-10-21T00:00:00Z"
}
```

#### List Messages
```
GET /channels/:channelId/messages?limit=50&offset=0

Response:
{
  "messages": [
    {
      "id": "uuid",
      "content": "Hello, team!",
      "userId": "user-uuid",
      "userName": "John Doe",
      "userImage": "https://...",
      "createdAt": "2025-10-21T00:00:00Z",
      "attachments": [
        {
          "id": "uuid",
          "fileName": "document.pdf",
          "fileSize": 12345,
          "mimeType": "application/pdf"
        }
      ]
    }
  ],
  "total": 1
}
```

### File Management

#### Upload File
```
POST /files/upload
Authorization: <user-id>

Request:
{
  "messageId": "message-uuid",
  "fileName": "document.pdf",
  "fileContent": "base64-encoded-content",
  "mimeType": "application/pdf"
}

Response:
{
  "id": "uuid",
  "fileName": "document.pdf",
  "fileSize": 12345,
  "storageKey": "uuid-document.pdf"
}
```

#### Download File
```
GET /files/:fileId/download

Response:
{
  "fileName": "document.pdf",
  "mimeType": "application/pdf",
  "fileContent": "base64-encoded-content"
}
```

## Pub/Sub Topic

### New Message Event
```typescript
interface NewMessageEvent {
  messageId: string;
  channelId: string;
  userId: string;
  content: string;
  timestamp: Date;
}
```

The `new-message` topic publishes an event every time a message is sent. Subscribe to this topic to:
- Send push notifications
- Trigger webhooks
- Update real-time dashboards
- Log message activity

## Infrastructure Components

### Object Storage
- **Bucket Name**: `message-files`
- **Versioning**: Disabled
- **Purpose**: Store uploaded files

### Cron Job
- **Name**: `cleanup-old-files`
- **Schedule**: Daily at 2 AM (0 2 * * *)
- **Function**: Delete files older than 90 days

### Pub/Sub
- **Topic**: `new-message`
- **Delivery**: At-least-once
- **Subscribers**:
  - `log-new-messages` - Logs messages to console

## Running the Service

1. Install dependencies:
```bash
npm install
```

2. Run migrations:
```bash
npm run db:generate
```

3. Start the backend:
```bash
encore run
```

The service will be available at `http://localhost:4001`

## Authentication

The service uses a simplified authentication mechanism via the `Authorization` header. For production use, integrate with the existing BetterAuth setup:

1. Extract user ID from session token
2. Validate session with BetterAuth
3. Use the validated user ID for all operations

## Future Enhancements

- WebSocket support for real-time message updates
- Message reactions and threads
- Direct messages between users
- File size limits and validation
- Image preview generation
- Full-text search across messages
- Read receipts and typing indicators
- Message editing and deletion
- Channel permissions and private channels
- File virus scanning
- CDN integration for file delivery
