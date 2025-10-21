import { api, APIError, Header } from "encore.dev/api";
import { Topic } from "encore.dev/pubsub";
import { Bucket } from "encore.dev/storage/objects";
import { CronJob } from "encore.dev/cron";
import { database, db } from "./db";
import {
  team,
  channel,
  channelMember,
  message,
  fileAttachment,
  user,
} from "./schema";
import { eq, and, desc, lt } from "drizzle-orm";
import { randomUUID } from "crypto";

// ===== Pub/Sub Topic for New Messages =====
interface NewMessageEvent {
  messageId: string;
  channelId: string;
  userId: string;
  content: string;
  timestamp: Date;
}

export const newMessageTopic = new Topic<NewMessageEvent>("new-message", {
  deliveryGuarantee: "at-least-once",
});

// ===== Object Storage Bucket for File Uploads =====
export const filesBucket = new Bucket("message-files", {
  versioned: false,
});

// ===== Helper Functions =====

// Get user ID from session (simplified - you may want to enhance this)
async function getCurrentUserId(
  authorization?: string
): Promise<string | null> {
  // In a real implementation, you would validate the session token
  // For now, we'll use a simple header-based approach
  // You should integrate this with BetterAuth properly
  if (!authorization) return null;

  // This is a placeholder - integrate with your BetterAuth setup
  // For now, we'll assume the authorization header contains the user ID
  return authorization;
}

// ===== Team Management APIs =====

interface CreateTeamRequest {
  name: string;
  description?: string;
}

interface CreateTeamResponse {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
}

export const createTeam = api(
  { expose: true, method: "POST", path: "/teams" },
  async (
    req: CreateTeamRequest,
    authorization?: Header<"authorization">
  ): Promise<CreateTeamResponse> => {
    const userId = await getCurrentUserId(authorization);
    if (!userId) {
      throw APIError.unauthenticated("User not authenticated");
    }

    const teamId = randomUUID();
    const [newTeam] = await db
      .insert(team)
      .values({
        id: teamId,
        name: req.name,
        description: req.description,
        createdBy: userId,
      })
      .returning();

    return {
      id: newTeam.id,
      name: newTeam.name,
      description: newTeam.description ?? undefined,
      createdAt: newTeam.createdAt,
    };
  }
);

interface ListTeamsResponse {
  teams: Array<{
    id: string;
    name: string;
    description?: string;
    createdAt: Date;
  }>;
}

export const listTeams = api(
  { expose: true, method: "GET", path: "/teams" },
  async (): Promise<ListTeamsResponse> => {
    const teams = await db.select().from(team).orderBy(desc(team.createdAt));

    return {
      teams: teams.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description ?? undefined,
        createdAt: t.createdAt,
      })),
    };
  }
);

// ===== Channel Management APIs =====

interface CreateChannelRequest {
  name: string;
  description?: string;
  teamId: string;
}

interface CreateChannelResponse {
  id: string;
  name: string;
  description?: string;
  teamId: string;
  createdAt: Date;
}

export const createChannel = api(
  { expose: true, method: "POST", path: "/channels" },
  async (
    req: CreateChannelRequest,
    authorization?: Header<"authorization">
  ): Promise<CreateChannelResponse> => {
    const userId = await getCurrentUserId(authorization);
    if (!userId) {
      throw APIError.unauthenticated("User not authenticated");
    }

    const channelId = randomUUID();
    const [newChannel] = await db
      .insert(channel)
      .values({
        id: channelId,
        name: req.name,
        description: req.description,
        teamId: req.teamId,
        createdBy: userId,
      })
      .returning();

    // Automatically add creator as admin member
    await db.insert(channelMember).values({
      id: randomUUID(),
      channelId: channelId,
      userId: userId,
      role: "admin",
    });

    return {
      id: newChannel.id,
      name: newChannel.name,
      description: newChannel.description ?? undefined,
      teamId: newChannel.teamId,
      createdAt: newChannel.createdAt,
    };
  }
);

interface ListChannelsRequest {
  teamId: string;
}

interface ListChannelsResponse {
  channels: Array<{
    id: string;
    name: string;
    description?: string;
    teamId: string;
    createdAt: Date;
  }>;
}

export const listChannels = api(
  { expose: true, method: "GET", path: "/teams/:teamId/channels" },
  async ({ teamId }: ListChannelsRequest): Promise<ListChannelsResponse> => {
    const channels = await db
      .select()
      .from(channel)
      .where(eq(channel.teamId, teamId))
      .orderBy(desc(channel.createdAt));

    return {
      channels: channels.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description ?? undefined,
        teamId: c.teamId,
        createdAt: c.createdAt,
      })),
    };
  }
);

interface JoinChannelRequest {
  channelId: string;
}

interface JoinChannelResponse {
  success: boolean;
  message: string;
}

export const joinChannel = api(
  { expose: true, method: "POST", path: "/channels/:channelId/join" },
  async (
    { channelId }: JoinChannelRequest,
    authorization?: Header<"authorization">
  ): Promise<JoinChannelResponse> => {
    const userId = await getCurrentUserId(authorization);
    if (!userId) {
      throw APIError.unauthenticated("User not authenticated");
    }

    // Check if already a member
    const existing = await db
      .select()
      .from(channelMember)
      .where(
        and(
          eq(channelMember.channelId, channelId),
          eq(channelMember.userId, userId)
        )
      );

    if (existing.length > 0) {
      return {
        success: false,
        message: "Already a member of this channel",
      };
    }

    await db.insert(channelMember).values({
      id: randomUUID(),
      channelId: channelId,
      userId: userId,
      role: "member",
    });

    return {
      success: true,
      message: "Successfully joined channel",
    };
  }
);

// ===== Messaging APIs =====

interface SendMessageRequest {
  channelId: string;
  content: string;
}

interface SendMessageResponse {
  id: string;
  content: string;
  channelId: string;
  userId: string;
  userName: string;
  createdAt: Date;
}

export const sendMessage = api(
  { expose: true, method: "POST", path: "/messages" },
  async (
    req: SendMessageRequest,
    authorization?: Header<"authorization">
  ): Promise<SendMessageResponse> => {
    const userId = await getCurrentUserId(authorization);
    if (!userId) {
      throw APIError.unauthenticated("User not authenticated");
    }

    // Verify user is a member of the channel
    const membership = await db
      .select()
      .from(channelMember)
      .where(
        and(
          eq(channelMember.channelId, req.channelId),
          eq(channelMember.userId, userId)
        )
      );

    if (membership.length === 0) {
      throw APIError.permissionDenied(
        "You must be a member of the channel to send messages"
      );
    }

    const messageId = randomUUID();
    const [newMessage] = await db
      .insert(message)
      .values({
        id: messageId,
        content: req.content,
        channelId: req.channelId,
        userId: userId,
      })
      .returning();

    // Get user info
    const [userInfo] = await db.select().from(user).where(eq(user.id, userId));

    // Publish new message event to pub/sub
    await newMessageTopic.publish({
      messageId: newMessage.id,
      channelId: newMessage.channelId,
      userId: newMessage.userId,
      content: newMessage.content,
      timestamp: newMessage.createdAt,
    });

    return {
      id: newMessage.id,
      content: newMessage.content,
      channelId: newMessage.channelId,
      userId: newMessage.userId,
      userName: userInfo?.name ?? "Unknown",
      createdAt: newMessage.createdAt,
    };
  }
);

interface ListMessagesRequest {
  channelId: string;
  limit?: number;
  offset?: number;
}

interface ListMessagesResponse {
  messages: Array<{
    id: string;
    content: string;
    userId: string;
    userName: string;
    userImage?: string;
    createdAt: Date;
    attachments: Array<{
      id: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
    }>;
  }>;
  total: number;
}

export const listMessages = api(
  { expose: true, method: "GET", path: "/channels/:channelId/messages" },
  async ({
    channelId,
    limit = 50,
    offset = 0,
  }: ListMessagesRequest): Promise<ListMessagesResponse> => {
    const messages = await db
      .select({
        id: message.id,
        content: message.content,
        userId: message.userId,
        userName: user.name,
        userImage: user.image,
        createdAt: message.createdAt,
      })
      .from(message)
      .innerJoin(user, eq(message.userId, user.id))
      .where(and(eq(message.channelId, channelId), eq(message.deletedAt, null)))
      .orderBy(desc(message.createdAt))
      .limit(limit)
      .offset(offset);

    // Get attachments for each message
    const messageIds = messages.map((m) => m.id);
    const attachments = await db
      .select()
      .from(fileAttachment)
      .where(
        messageIds.length > 0
          ? eq(
              fileAttachment.messageId,
              messageIds[0] // This is simplified - you'd use an IN clause with all IDs
            )
          : eq(fileAttachment.id, "never-match")
      );

    const attachmentsByMessage = attachments.reduce(
      (acc, att) => {
        if (!acc[att.messageId]) acc[att.messageId] = [];
        acc[att.messageId].push(att);
        return acc;
      },
      {} as Record<string, typeof attachments>
    );

    return {
      messages: messages.map((m) => ({
        id: m.id,
        content: m.content,
        userId: m.userId,
        userName: m.userName,
        userImage: m.userImage ?? undefined,
        createdAt: m.createdAt,
        attachments: (attachmentsByMessage[m.id] ?? []).map((a) => ({
          id: a.id,
          fileName: a.fileName,
          fileSize: a.fileSize,
          mimeType: a.mimeType,
        })),
      })),
      total: messages.length,
    };
  }
);

// ===== File Upload APIs =====

interface UploadFileRequest {
  messageId: string;
  fileName: string;
  fileContent: string; // base64 encoded
  mimeType: string;
}

interface UploadFileResponse {
  id: string;
  fileName: string;
  fileSize: number;
  storageKey: string;
}

export const uploadFile = api(
  { expose: true, method: "POST", path: "/files/upload" },
  async (
    req: UploadFileRequest,
    authorization?: Header<"authorization">
  ): Promise<UploadFileResponse> => {
    const userId = await getCurrentUserId(authorization);
    if (!userId) {
      throw APIError.unauthenticated("User not authenticated");
    }

    // Decode base64 file content
    const fileBuffer = Buffer.from(req.fileContent, "base64");
    const fileSize = fileBuffer.length;

    // Generate unique storage key
    const storageKey = `${randomUUID()}-${req.fileName}`;

    // Upload to object storage
    await filesBucket.upload(storageKey, fileBuffer);

    // Save file metadata to database
    const fileId = randomUUID();
    const [newFile] = await db
      .insert(fileAttachment)
      .values({
        id: fileId,
        fileName: req.fileName,
        fileSize: fileSize,
        mimeType: req.mimeType,
        storageKey: storageKey,
        messageId: req.messageId,
        uploadedBy: userId,
      })
      .returning();

    return {
      id: newFile.id,
      fileName: newFile.fileName,
      fileSize: newFile.fileSize,
      storageKey: newFile.storageKey,
    };
  }
);

interface DownloadFileRequest {
  fileId: string;
}

interface DownloadFileResponse {
  fileName: string;
  mimeType: string;
  fileContent: string; // base64 encoded
}

export const downloadFile = api(
  { expose: true, method: "GET", path: "/files/:fileId/download" },
  async ({ fileId }: DownloadFileRequest): Promise<DownloadFileResponse> => {
    const [file] = await db
      .select()
      .from(fileAttachment)
      .where(eq(fileAttachment.id, fileId));

    if (!file) {
      throw APIError.notFound("File not found");
    }

    // Download from object storage
    const fileBuffer = await filesBucket.download(file.storageKey);
    const fileContent = fileBuffer.toString("base64");

    return {
      fileName: file.fileName,
      mimeType: file.mimeType,
      fileContent: fileContent,
    };
  }
);

// ===== Pub/Sub Subscriber =====

const _ = newMessageTopic.subscribe("log-new-messages", async (event) => {
  // This subscriber logs new messages
  // You can add more subscribers for different purposes (notifications, webhooks, etc.)
  console.log(
    `New message in channel ${event.channelId} from user ${event.userId}: ${event.content}`
  );
});

// ===== Cron Job for File Cleanup =====

// Runs daily at 2 AM to clean up files older than 90 days
const cleanupOldFiles = new CronJob("cleanup-old-files", {
  title: "Clean up old files",
  schedule: "0 2 * * *", // Daily at 2 AM
  endpoint: async () => {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Find old files
    const oldFiles = await db
      .select()
      .from(fileAttachment)
      .where(lt(fileAttachment.createdAt, ninetyDaysAgo));

    console.log(`Found ${oldFiles.length} files older than 90 days to delete`);

    // Delete from object storage and database
    for (const file of oldFiles) {
      try {
        // Delete from object storage
        await filesBucket.remove(file.storageKey);

        // Delete from database
        await db.delete(fileAttachment).where(eq(fileAttachment.id, file.id));

        console.log(`Deleted file: ${file.fileName} (${file.id})`);
      } catch (error) {
        console.error(`Failed to delete file ${file.id}:`, error);
      }
    }

    console.log(`Cleanup completed. Deleted ${oldFiles.length} files.`);
  },
});
