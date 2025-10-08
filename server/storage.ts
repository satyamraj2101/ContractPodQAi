// Storage interface and implementation - see blueprint:javascript_log_in_with_replit
import {
  users,
  chatMessages,
  documents,
  documentChunks,
  documentImages,
  type User,
  type UpsertUser,
  type ChatMessage,
  type InsertChatMessage,
  type Document,
  type InsertDocument,
  type DocumentChunk,
  type InsertDocumentChunk,
  type DocumentImage,
  type InsertDocumentImage,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, lt, desc } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Chat message operations
  getChatMessages(userId: string, limit?: number): Promise<ChatMessage[]>;
  insertChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  deleteOldChatMessages(daysOld: number): Promise<void>;
  
  // Document operations
  getDocuments(): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  insertDocument(doc: InsertDocument): Promise<Document>;
  deleteDocument(id: string): Promise<void>;
  
  // Document chunk operations
  getDocumentChunks(documentId: string): Promise<DocumentChunk[]>;
  insertDocumentChunk(chunk: InsertDocumentChunk): Promise<DocumentChunk>;
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

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Chat message operations
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
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
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

// Use MemStorage for now, will switch to DatabaseStorage after migration
export const storage = new DatabaseStorage();
