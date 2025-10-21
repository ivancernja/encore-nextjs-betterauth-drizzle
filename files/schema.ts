import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const uploadedFiles = pgTable("uploaded_files", {
  id: text("id").primaryKey(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  storageKey: text("storage_key").notNull().unique(),
  uploadedBy: text("uploaded_by"),
  uploadedAt: timestamp("uploaded_at", { mode: "date" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  expiresAt: timestamp("expires_at", { mode: "date" }),
  shareToken: text("share_token").unique(),
  isPublic: boolean("is_public").notNull().default(false),
  downloadCount: integer("download_count").notNull().default(0),
});

export type UploadedFile = typeof uploadedFiles.$inferSelect;
export type NewUploadedFile = typeof uploadedFiles.$inferInsert;
