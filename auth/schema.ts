import { pgTable, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";

// User table - compatible with Better Auth
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// Session table - compatible with Better Auth
export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

// Account table - for OAuth providers
export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// Verification table - for email verification
export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// Team table - for organizing users into teams
export const team = pgTable("team", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: text("createdBy")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// Channel table - for organizing conversations within teams
export const channel = pgTable("channel", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  teamId: text("teamId")
    .notNull()
    .references(() => team.id, { onDelete: "cascade" }),
  createdBy: text("createdBy")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// Channel members - many-to-many relationship between users and channels
export const channelMember = pgTable("channelMember", {
  id: text("id").primaryKey(),
  channelId: text("channelId")
    .notNull()
    .references(() => channel.id, { onDelete: "cascade" }),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"), // member, admin
  joinedAt: timestamp("joinedAt").notNull().defaultNow(),
});

// Message table - for storing chat messages
export const message = pgTable("message", {
  id: text("id").primaryKey(),
  content: text("content").notNull(),
  channelId: text("channelId")
    .notNull()
    .references(() => channel.id, { onDelete: "cascade" }),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  deletedAt: timestamp("deletedAt"), // soft delete
});

// File attachment table - for storing file metadata
export const fileAttachment = pgTable("fileAttachment", {
  id: text("id").primaryKey(),
  fileName: text("fileName").notNull(),
  fileSize: integer("fileSize").notNull(), // in bytes
  mimeType: text("mimeType").notNull(),
  storageKey: text("storageKey").notNull(), // key in object storage
  messageId: text("messageId")
    .notNull()
    .references(() => message.id, { onDelete: "cascade" }),
  uploadedBy: text("uploadedBy")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});
