import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (enhanced with email/password auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  passwordHash: varchar("password_hash"), // For email/password auth
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  employeeId: varchar("employee_id"),
  mobile: varchar("mobile"),
  profilePicUrl: varchar("profile_pic_url"),
  isAdmin: boolean("is_admin").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const upsertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profilePicUrl: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;

// Password reset requests table
export const passwordResetRequests = pgTable("password_reset_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  newPasswordHash: varchar("new_password_hash").notNull(), // Pre-hashed password
  status: varchar("status").notNull().default("pending"), // 'pending', 'approved', 'rejected'
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNote: text("review_note"),
}, (table) => [
  index("idx_password_reset_user_id").on(table.userId),
  index("idx_password_reset_status").on(table.status),
]);

export const insertPasswordResetRequestSchema = createInsertSchema(passwordResetRequests).omit({
  id: true,
  requestedAt: true,
});

export type InsertPasswordResetRequest = z.infer<typeof insertPasswordResetRequestSchema>;
export type PasswordResetRequest = typeof passwordResetRequests.$inferSelect;

// Login history table for activity tracking
export const loginHistory = pgTable("login_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  loginAt: timestamp("login_at").defaultNow().notNull(),
  ipAddress: varchar("ip_address"),
  userAgent: varchar("user_agent"),
}, (table) => [
  index("idx_login_history_user_id").on(table.userId),
  index("idx_login_history_login_at").on(table.loginAt),
]);

export const insertLoginHistorySchema = createInsertSchema(loginHistory).omit({
  id: true,
  loginAt: true,
});

export type InsertLoginHistory = z.infer<typeof insertLoginHistorySchema>;
export type LoginHistory = typeof loginHistory.$inferSelect;

// User feedback table
export const feedbacks = pgTable("feedbacks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  conversationId: varchar("conversation_id").references(() => conversations.id, { onDelete: 'set null' }),
  messageId: varchar("message_id").references(() => chatMessages.id, { onDelete: 'set null' }),
  feedbackType: varchar("feedback_type").notNull(), // 'positive', 'negative', 'suggestion'
  feedbackText: text("feedback_text"),
  rating: integer("rating"), // Optional 1-5 rating
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
}, (table) => [
  index("idx_feedbacks_user_id").on(table.userId),
  index("idx_feedbacks_submitted_at").on(table.submittedAt),
]);

export const insertFeedbackSchema = createInsertSchema(feedbacks).omit({
  id: true,
  submittedAt: true,
});

export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedbacks.$inferSelect;

// Conversations table (chat grouping)
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar("title").notNull(), // Auto-generated from first message
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
}, (table) => [
  index("idx_conversations_user_id").on(table.userId),
  index("idx_conversations_created_at").on(table.createdAt),
]);

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

// Documents table
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: varchar("filename").notNull(),
  originalFilename: varchar("original_filename").notNull(),
  fileType: varchar("file_type").notNull(),
  fileSize: varchar("file_size").notNull(),
  filePath: varchar("file_path").notNull(),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  uploadDate: timestamp("upload_date").defaultNow().notNull(),
  textContent: text("text_content"),
  embeddings: jsonb("embeddings"),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  uploadDate: true,
});

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

// Chat messages table (updated to reference conversations)
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  sources: jsonb("sources"), // Array of source citations
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (table) => [
  index("idx_chat_messages_conversation_id").on(table.conversationId),
  index("idx_chat_messages_user_id").on(table.userId),
  index("idx_chat_messages_timestamp").on(table.timestamp),
]);

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  timestamp: true,
});

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// Document chunks for vector storage
export const documentChunks = pgTable("document_chunks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull().references(() => documents.id, { onDelete: 'cascade' }),
  chunkText: text("chunk_text").notNull(),
  chunkIndex: varchar("chunk_index").notNull(),
  embedding: jsonb("embedding"), // Store vector embedding as JSON array
  pageNumber: varchar("page_number"),
}, (table) => [
  index("idx_document_chunks_document_id").on(table.documentId),
]);

export const insertDocumentChunkSchema = createInsertSchema(documentChunks).omit({
  id: true,
});

export type InsertDocumentChunk = z.infer<typeof insertDocumentChunkSchema>;
export type DocumentChunk = typeof documentChunks.$inferSelect;

// Document images table for storing extracted images and AI descriptions
export const documentImages = pgTable("document_images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull().references(() => documents.id, { onDelete: 'cascade' }),
  imagePath: text("image_path").notNull(),
  imageIndex: varchar("image_index").notNull(),
  aiDescription: text("ai_description"),
  imageContext: text("image_context"),
  embedding: jsonb("embedding"),
  extractedAt: timestamp("extracted_at").defaultNow().notNull(),
}, (table) => [
  index("idx_document_images_document_id").on(table.documentId),
]);

export const insertDocumentImageSchema = createInsertSchema(documentImages).omit({
  id: true,
  extractedAt: true,
});

export type InsertDocumentImage = z.infer<typeof insertDocumentImageSchema>;
export type DocumentImage = typeof documentImages.$inferSelect;
