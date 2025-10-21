import { api, APIError } from "encore.dev/api";
import { filesBucket } from "./storage";
import { filesDb } from "./db";
import { uploadedFiles } from "./schema";
import { eq, sql } from "drizzle-orm";
import { randomBytes } from "crypto";

// Generate unique file ID
function generateFileId(): string {
  return randomBytes(16).toString("hex");
}

// Generate shareable token
function generateShareToken(): string {
  return randomBytes(32).toString("base64url");
}

// Request/Response types
export interface UploadRequest {
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileData: string; // base64 encoded file data
  uploadedBy?: string;
  isPublic?: boolean;
}

export interface UploadResponse {
  id: string;
  fileName: string;
  fileSize: number;
  shareToken: string;
  shareUrl: string;
  uploadedAt: Date;
}

export interface DownloadRequest {
  id?: string;
  shareToken?: string;
}

export interface FileInfo {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy?: string;
  uploadedAt: Date;
  downloadCount: number;
}

export interface ListFilesRequest {
  uploadedBy?: string;
  limit?: number;
  offset?: number;
}

export interface ListFilesResponse {
  files: FileInfo[];
  total: number;
}

// Upload a file
export const upload = api(
  {
    expose: true,
    method: "POST",
    path: "/files/upload",
    auth: false // Set to true if you want to require authentication
  },
  async (req: UploadRequest): Promise<UploadResponse> => {
    const fileId = generateFileId();
    const shareToken = generateShareToken();
    const storageKey = `${fileId}/${req.fileName}`;

    // Decode base64 file data
    const fileBuffer = Buffer.from(req.fileData, "base64");

    // Validate file size matches
    if (fileBuffer.length !== req.fileSize) {
      throw APIError.invalidArgument("File size mismatch");
    }

    // Upload to object storage
    await filesBucket.upload(storageKey, fileBuffer, {
      contentType: req.mimeType,
    });

    // Calculate expiration (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Store metadata in database
    const [file] = await filesDb
      .insert(uploadedFiles)
      .values({
        id: fileId,
        fileName: req.fileName,
        fileSize: req.fileSize,
        mimeType: req.mimeType,
        storageKey: storageKey,
        uploadedBy: req.uploadedBy,
        shareToken: shareToken,
        isPublic: req.isPublic ?? false,
        expiresAt: expiresAt,
      })
      .returning();

    // Construct share URL (update with your actual domain in production)
    const shareUrl = `${process.env.ENCORE_API_BASE_URL || "http://localhost:4001"}/files/share/${shareToken}`;

    return {
      id: file.id,
      fileName: file.fileName,
      fileSize: file.fileSize,
      shareToken: file.shareToken!,
      shareUrl: shareUrl,
      uploadedAt: file.uploadedAt,
    };
  }
);

// Download a file by ID or share token
export const download = api(
  {
    expose: true,
    method: "GET",
    path: "/files/download",
    auth: false,
  },
  async (req: DownloadRequest): Promise<{ fileName: string; fileData: string; mimeType: string }> => {
    if (!req.id && !req.shareToken) {
      throw APIError.invalidArgument("Either id or shareToken must be provided");
    }

    // Find file metadata
    let file;
    if (req.shareToken) {
      file = await filesDb.query.uploadedFiles.findFirst({
        where: eq(uploadedFiles.shareToken, req.shareToken),
      });
    } else if (req.id) {
      file = await filesDb.query.uploadedFiles.findFirst({
        where: eq(uploadedFiles.id, req.id),
      });
    }

    if (!file) {
      throw APIError.notFound("File not found");
    }

    // Check if file has expired
    if (file.expiresAt && file.expiresAt < new Date()) {
      throw APIError.notFound("File has expired");
    }

    // Download from object storage
    const fileBuffer = await filesBucket.download(file.storageKey);

    // Increment download count
    await filesDb
      .update(uploadedFiles)
      .set({ downloadCount: sql`${uploadedFiles.downloadCount} + 1` })
      .where(eq(uploadedFiles.id, file.id));

    // Return file as base64
    return {
      fileName: file.fileName,
      fileData: fileBuffer.toString("base64"),
      mimeType: file.mimeType,
    };
  }
);

// Get shareable link for a file
export const getShareLink = api(
  {
    expose: true,
    method: "GET",
    path: "/files/:id/share",
    auth: false,
  },
  async ({ id }: { id: string }): Promise<{ shareUrl: string; shareToken: string }> => {
    const file = await filesDb.query.uploadedFiles.findFirst({
      where: eq(uploadedFiles.id, id),
    });

    if (!file) {
      throw APIError.notFound("File not found");
    }

    if (!file.shareToken) {
      // Generate a new share token if one doesn't exist
      const shareToken = generateShareToken();
      await filesDb
        .update(uploadedFiles)
        .set({ shareToken })
        .where(eq(uploadedFiles.id, id));

      const shareUrl = `${process.env.ENCORE_API_BASE_URL || "http://localhost:4001"}/files/share/${shareToken}`;
      return { shareUrl, shareToken };
    }

    const shareUrl = `${process.env.ENCORE_API_BASE_URL || "http://localhost:4001"}/files/share/${file.shareToken}`;
    return { shareUrl, shareToken: file.shareToken };
  }
);

// Download file via share link (convenience endpoint)
export const shareDownload = api.raw(
  {
    expose: true,
    method: "GET",
    path: "/files/share/:token",
    auth: false,
  },
  async (req, resp) => {
    const token = req.params.token as string;

    const file = await filesDb.query.uploadedFiles.findFirst({
      where: eq(uploadedFiles.shareToken, token),
    });

    if (!file) {
      resp.writeHead(404, { "Content-Type": "application/json" });
      resp.end(JSON.stringify({ error: "File not found" }));
      return;
    }

    // Check if file has expired
    if (file.expiresAt && file.expiresAt < new Date()) {
      resp.writeHead(410, { "Content-Type": "application/json" });
      resp.end(JSON.stringify({ error: "File has expired" }));
      return;
    }

    // Download from object storage
    const fileBuffer = await filesBucket.download(file.storageKey);

    // Increment download count
    await filesDb
      .update(uploadedFiles)
      .set({ downloadCount: sql`${uploadedFiles.downloadCount} + 1` })
      .where(eq(uploadedFiles.id, file.id));

    // Return file as download
    resp.writeHead(200, {
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename="${file.fileName}"`,
      "Content-Length": fileBuffer.length,
    });
    resp.end(fileBuffer);
  }
);

// List uploaded files
export const listFiles = api(
  {
    expose: true,
    method: "GET",
    path: "/files",
    auth: false,
  },
  async (req: ListFilesRequest): Promise<ListFilesResponse> => {
    const limit = req.limit ?? 50;
    const offset = req.offset ?? 0;

    const whereClause = req.uploadedBy
      ? eq(uploadedFiles.uploadedBy, req.uploadedBy)
      : undefined;

    const files = await filesDb.query.uploadedFiles.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy: (files, { desc }) => [desc(files.uploadedAt)],
    });

    // Get total count
    const [{ count }] = await filesDb
      .select({ count: sql<number>`count(*)` })
      .from(uploadedFiles)
      .where(whereClause ?? sql`true`);

    return {
      files: files.map((f) => ({
        id: f.id,
        fileName: f.fileName,
        fileSize: f.fileSize,
        mimeType: f.mimeType,
        uploadedBy: f.uploadedBy ?? undefined,
        uploadedAt: f.uploadedAt,
        downloadCount: f.downloadCount,
      })),
      total: Number(count),
    };
  }
);

// Delete a file
export const deleteFile = api(
  {
    expose: true,
    method: "DELETE",
    path: "/files/:id",
    auth: false,
  },
  async ({ id }: { id: string }): Promise<{ success: boolean }> => {
    const file = await filesDb.query.uploadedFiles.findFirst({
      where: eq(uploadedFiles.id, id),
    });

    if (!file) {
      throw APIError.notFound("File not found");
    }

    // Delete from object storage
    await filesBucket.remove(file.storageKey);

    // Delete from database
    await filesDb.delete(uploadedFiles).where(eq(uploadedFiles.id, id));

    return { success: true };
  }
);
