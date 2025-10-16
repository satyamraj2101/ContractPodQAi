// Storage interface and implementation
import {
  users,
  chatMessages,
  documents,
  documentChunks,
  documentImages,
  passwordResetRequests,
  loginHistory,
  feedbacks,
  feedbackSubmissions,
  conversations,
  type User,
  type InsertUser,
  type UpsertUser,
  type ChatMessage,
  type InsertChatMessage,
  type Document,
  type InsertDocument,
  type DocumentChunk,
  type InsertDocumentChunk,
  type DocumentImage,
  type InsertDocumentImage,
  type PasswordResetRequest,
  type InsertPasswordResetRequest,
  type LoginHistory,
  type InsertLoginHistory,
  type Feedback,
  type InsertFeedback,
  type FeedbackSubmission,
  type InsertFeedbackSubmission,
  type Conversation,
  type InsertConversation,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, lt, desc, sql as drizzleSql, gte } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  // Password reset operations
  createPasswordResetRequest(request: InsertPasswordResetRequest): Promise<PasswordResetRequest>;
  getPasswordResetRequests(status?: string): Promise<PasswordResetRequest[]>;
  getUserPasswordResetRequests(userId: string): Promise<PasswordResetRequest[]>;
  updatePasswordResetRequest(id: string, updates: Partial<InsertPasswordResetRequest>): Promise<PasswordResetRequest>;
  
  // Login history operations
  recordLogin(loginData: InsertLoginHistory): Promise<LoginHistory>;
  getUserLoginHistory(userId: string, limit?: number): Promise<LoginHistory[]>;
  getUserActivityStats(userId: string, days?: number): Promise<{ loginCount: number; messageCount: number }>;
  getAllUsersActivity(days?: number): Promise<any[]>;
  
  // Feedback operations
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;
  getAllFeedbacks(): Promise<Feedback[]>;
  getUserFeedbacks(userId: string): Promise<Feedback[]>;
  
  // Feedback submission operations (general user feedback)
  createFeedbackSubmission(submission: InsertFeedbackSubmission): Promise<FeedbackSubmission>;
  getAllFeedbackSubmissions(): Promise<any[]>;
  getUserFeedbackSubmissions(userId: string): Promise<FeedbackSubmission[]>;
  updateFeedbackSubmissionStatus(id: string, status: string): Promise<FeedbackSubmission>;
  getFeedbackSubmission(id: string): Promise<FeedbackSubmission | undefined>;
  
  // Conversation operations
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getUserConversations(userId: string): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  updateConversation(id: string, updates: Partial<InsertConversation>): Promise<Conversation>;
  deleteConversation(id: string): Promise<void>;
  countUserActiveConversations(userId: string): Promise<number>;
  
  // Chat message operations
  getConversationMessages(conversationId: string): Promise<ChatMessage[]>;
  getChatMessages(userId: string, limit?: number): Promise<ChatMessage[]>;
  insertChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  deleteOldChatMessages(daysOld: number): Promise<void>;
  countUserMessagesInPeriod(userId: string, days: number): Promise<number>;
  
  // Document operations
  getDocuments(): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  insertDocument(doc: InsertDocument): Promise<Document>;
  deleteDocument(id: string): Promise<void>;
  
  // Document chunk operations
  getDocumentChunks(documentId: string): Promise<DocumentChunk[]>;
  insertDocumentChunk(chunk: InsertDocumentChunk): Promise<DocumentChunk>;
  deleteDocumentChunk(id: string): Promise<void>;
  searchDocumentChunks(query: string, queryEmbedding: number[]): Promise<DocumentChunk[]>;
  
  // Document image operations
  getDocumentImages(documentId: string): Promise<DocumentImage[]>;
  insertDocumentImage(image: InsertDocumentImage): Promise<DocumentImage>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    // Always normalize email to lowercase for case-insensitive lookup
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    // Always normalize email to lowercase before storing
    const userData = {
      ...user,
      email: user.email?.toLowerCase(),
    };
    const [newUser] = await db.insert(users).values(userData).returning();
    return newUser;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    // Always normalize email to lowercase if email is being updated
    const updateData = {
      ...updates,
      ...(updates.email && { email: updates.email.toLowerCase() }),
      updatedAt: new Date(),
    };
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Always normalize email to lowercase before storing
    const normalizedData = {
      ...userData,
      ...(userData.email && { email: userData.email.toLowerCase() }),
    };
    const [user] = await db
      .insert(users)
      .values(normalizedData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...normalizedData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  // Password reset operations
  async createPasswordResetRequest(request: InsertPasswordResetRequest): Promise<PasswordResetRequest> {
    const [resetRequest] = await db
      .insert(passwordResetRequests)
      .values(request)
      .returning();
    return resetRequest;
  }

  async getPasswordResetRequests(status?: string): Promise<any[]> {
    const query = db
      .select({
        id: passwordResetRequests.id,
        userId: passwordResetRequests.userId,
        newPasswordHash: passwordResetRequests.newPasswordHash,
        status: passwordResetRequests.status,
        reviewedBy: passwordResetRequests.reviewedBy,
        reviewedAt: passwordResetRequests.reviewedAt,
        reviewNote: passwordResetRequests.reviewNote,
        requestedAt: passwordResetRequests.requestedAt,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        }
      })
      .from(passwordResetRequests)
      .leftJoin(users, eq(passwordResetRequests.userId, users.id))
      .orderBy(desc(passwordResetRequests.requestedAt));
    
    if (status) {
      return await query.where(eq(passwordResetRequests.status, status));
    }
    return await query;
  }

  async getUserPasswordResetRequests(userId: string): Promise<PasswordResetRequest[]> {
    return await db
      .select()
      .from(passwordResetRequests)
      .where(eq(passwordResetRequests.userId, userId))
      .orderBy(desc(passwordResetRequests.requestedAt));
  }

  async updatePasswordResetRequest(id: string, updates: Partial<InsertPasswordResetRequest>): Promise<PasswordResetRequest> {
    const [updated] = await db
      .update(passwordResetRequests)
      .set(updates)
      .where(eq(passwordResetRequests.id, id))
      .returning();
    return updated;
  }

  // Login history operations
  async recordLogin(loginData: InsertLoginHistory): Promise<LoginHistory> {
    const [login] = await db
      .insert(loginHistory)
      .values(loginData)
      .returning();
    return login;
  }

  async getUserLoginHistory(userId: string, limit: number = 50): Promise<LoginHistory[]> {
    return await db
      .select()
      .from(loginHistory)
      .where(eq(loginHistory.userId, userId))
      .orderBy(desc(loginHistory.loginAt))
      .limit(limit);
  }

  async getUserActivityStats(userId: string, days: number = 30): Promise<{ loginCount: number; messageCount: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Count logins in the last N days
    const logins = await db
      .select({ count: drizzleSql<number>`count(*)` })
      .from(loginHistory)
      .where(and(
        eq(loginHistory.userId, userId),
        gte(loginHistory.loginAt, cutoffDate)
      ));

    // Count messages in the last N days
    const messages = await db
      .select({ count: drizzleSql<number>`count(*)` })
      .from(chatMessages)
      .where(and(
        eq(chatMessages.userId, userId),
        gte(chatMessages.timestamp, cutoffDate)
      ));

    return {
      loginCount: Number(logins[0]?.count || 0),
      messageCount: Number(messages[0]?.count || 0),
    };
  }

  async getAllUsersActivity(days: number = 30): Promise<any[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Get all users with their login and message counts
    const allUsers = await db.select().from(users);
    
    const activityData = await Promise.all(
      allUsers.map(async (user) => {
        // Count logins
        const logins = await db
          .select({ count: drizzleSql<number>`count(*)` })
          .from(loginHistory)
          .where(and(
            eq(loginHistory.userId, user.id),
            gte(loginHistory.loginAt, cutoffDate)
          ));

        // Count messages
        const messages = await db
          .select({ count: drizzleSql<number>`count(*)` })
          .from(chatMessages)
          .where(and(
            eq(chatMessages.userId, user.id),
            gte(chatMessages.timestamp, cutoffDate)
          ));

        // Count conversations
        const convos = await db
          .select({ count: drizzleSql<number>`count(*)` })
          .from(conversations)
          .where(eq(conversations.userId, user.id));

        // Get last login
        const lastLogin = await db
          .select()
          .from(loginHistory)
          .where(eq(loginHistory.userId, user.id))
          .orderBy(desc(loginHistory.loginAt))
          .limit(1);

        return {
          userId: user.id,
          user: {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
          },
          loginCount: Number(logins[0]?.count || 0),
          messageCount: Number(messages[0]?.count || 0),
          conversationCount: Number(convos[0]?.count || 0),
          lastLogin: lastLogin[0]?.loginAt || null,
        };
      })
    );

    return activityData.filter(a => a.loginCount > 0 || a.messageCount > 0);
  }

  // Feedback operations
  async createFeedback(feedback: InsertFeedback): Promise<Feedback> {
    const [newFeedback] = await db
      .insert(feedbacks)
      .values(feedback)
      .returning();
    return newFeedback;
  }

  async getAllFeedbacks(): Promise<Feedback[]> {
    return await db
      .select()
      .from(feedbacks)
      .orderBy(desc(feedbacks.submittedAt));
  }

  async getUserFeedbacks(userId: string): Promise<Feedback[]> {
    return await db
      .select()
      .from(feedbacks)
      .where(eq(feedbacks.userId, userId))
      .orderBy(desc(feedbacks.submittedAt));
  }

  // Feedback submission operations (general user feedback)
  async createFeedbackSubmission(submission: InsertFeedbackSubmission): Promise<FeedbackSubmission> {
    const [newSubmission] = await db
      .insert(feedbackSubmissions)
      .values(submission)
      .returning();
    return newSubmission;
  }

  async getAllFeedbackSubmissions(): Promise<any[]> {
    return await db
      .select({
        id: feedbackSubmissions.id,
        feedbackText: feedbackSubmissions.feedbackText,
        attachmentPath: feedbackSubmissions.attachmentPath,
        attachmentFilename: feedbackSubmissions.attachmentFilename,
        submittedAt: feedbackSubmissions.submittedAt,
        status: feedbackSubmissions.status,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        }
      })
      .from(feedbackSubmissions)
      .leftJoin(users, eq(feedbackSubmissions.userId, users.id))
      .orderBy(desc(feedbackSubmissions.submittedAt));
  }

  async getUserFeedbackSubmissions(userId: string): Promise<FeedbackSubmission[]> {
    return await db
      .select()
      .from(feedbackSubmissions)
      .where(eq(feedbackSubmissions.userId, userId))
      .orderBy(desc(feedbackSubmissions.submittedAt));
  }

  async updateFeedbackSubmissionStatus(id: string, status: string): Promise<FeedbackSubmission> {
    const [updated] = await db
      .update(feedbackSubmissions)
      .set({ status })
      .where(eq(feedbackSubmissions.id, id))
      .returning();
    return updated;
  }

  async getFeedbackSubmission(id: string): Promise<FeedbackSubmission | undefined> {
    const [submission] = await db
      .select()
      .from(feedbackSubmissions)
      .where(eq(feedbackSubmissions.id, id));
    return submission;
  }

  // Conversation operations
  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [newConversation] = await db
      .insert(conversations)
      .values(conversation)
      .returning();
    return newConversation;
  }

  async getUserConversations(userId: string): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt));
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    return conversation;
  }

  async updateConversation(id: string, updates: Partial<InsertConversation>): Promise<Conversation> {
    const [updated] = await db
      .update(conversations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return updated;
  }

  async deleteConversation(id: string): Promise<void> {
    await db.delete(conversations).where(eq(conversations.id, id));
  }

  async countUserActiveConversations(userId: string): Promise<number> {
    const result = await db
      .select({ count: drizzleSql<number>`count(*)` })
      .from(conversations)
      .where(and(
        eq(conversations.userId, userId),
        eq(conversations.isActive, true)
      ));
    return Number(result[0]?.count || 0);
  }

  // Chat message operations
  async getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, conversationId))
      .orderBy(chatMessages.timestamp);
  }

  async getChatMessages(userId: string, limit: number = 50): Promise<ChatMessage[]> {
    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .orderBy(desc(chatMessages.timestamp))
      .limit(limit);
    
    return messages.reverse(); // Return in chronological order
  }

  async insertChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [chatMessage] = await db
      .insert(chatMessages)
      .values(message)
      .returning();
    return chatMessage;
  }

  async deleteOldChatMessages(daysOld: number): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    await db
      .delete(chatMessages)
      .where(lt(chatMessages.timestamp, cutoffDate));
  }

  async countUserMessagesInPeriod(userId: string, days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await db
      .select({ count: drizzleSql<number>`count(*)` })
      .from(chatMessages)
      .where(and(
        eq(chatMessages.userId, userId),
        gte(chatMessages.timestamp, cutoffDate)
      ));
    
    return Number(result[0]?.count || 0);
  }

  // Document operations
  async getDocuments(): Promise<Document[]> {
    return await db.select().from(documents).orderBy(desc(documents.uploadDate));
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc;
  }

  async insertDocument(doc: InsertDocument): Promise<Document> {
    const [document] = await db
      .insert(documents)
      .values(doc)
      .returning();
    return document;
  }

  async deleteDocument(id: string): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  // Document chunk operations
  async getDocumentChunks(documentId: string): Promise<DocumentChunk[]> {
    return await db
      .select()
      .from(documentChunks)
      .where(eq(documentChunks.documentId, documentId));
  }

  async insertDocumentChunk(chunk: InsertDocumentChunk): Promise<DocumentChunk> {
    const [documentChunk] = await db
      .insert(documentChunks)
      .values(chunk)
      .returning();
    return documentChunk;
  }

  async deleteDocumentChunk(id: string): Promise<void> {
    await db.delete(documentChunks).where(eq(documentChunks.id, id));
  }

  // Vector similarity search using embeddings
  async searchDocumentChunks(query: string, queryEmbedding: number[]): Promise<DocumentChunk[]> {
    const chunks = await db.select().from(documentChunks);
    
    // Similarity threshold - only return chunks above this score
    // This prevents irrelevant documents from being cited
    const SIMILARITY_THRESHOLD = 0.6; // 60% similarity required
    
    // Calculate cosine similarity for each chunk
    const chunksWithSimilarity = chunks
      .filter(chunk => chunk.embedding) // Only chunks with embeddings
      .map(chunk => {
        const embedding = chunk.embedding as number[];
        const similarity = this.cosineSimilarity(queryEmbedding, embedding);
        return { chunk, similarity };
      })
      .filter(item => item.similarity >= SIMILARITY_THRESHOLD) // Only keep relevant results
      .sort((a, b) => b.similarity - a.similarity) // Sort by similarity desc
      .slice(0, 5); // Return top 5 matches
    
    return chunksWithSimilarity.map(item => item.chunk);
  }

  // Helper: Calculate cosine similarity between two vectors
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;
    
    return dotProduct / denominator;
  }

  // Document image operations
  async getDocumentImages(documentId: string): Promise<DocumentImage[]> {
    return await db
      .select()
      .from(documentImages)
      .where(eq(documentImages.documentId, documentId));
  }

  async insertDocumentImage(image: InsertDocumentImage): Promise<DocumentImage> {
    const [documentImage] = await db
      .insert(documentImages)
      .values(image)
      .returning();
    return documentImage;
  }
}

// Export a singleton instance
export const storage = new DatabaseStorage();
