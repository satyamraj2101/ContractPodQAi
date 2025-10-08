// Routes implementation - see blueprint:javascript_log_in_with_replit
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./replitAuth";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import * as pdfParse from "pdf-parse";
import OpenAI from "openai";
import { insertChatMessageSchema, insertDocumentSchema } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['.pdf', '.txt', '.md', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, TXT, MD, and DOCX files are allowed.'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes - see blueprint:javascript_log_in_with_replit
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Chat message routes
  app.get('/api/chat/history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Clean up old messages (older than 7 days)
      await storage.deleteOldChatMessages(7);
      
      const messages = await storage.getChatMessages(userId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching chat history:", error);
      res.status(500).json({ message: "Failed to fetch chat history" });
    }
  });

  app.post('/api/chat/message', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { question } = req.body;

      if (!question || typeof question !== 'string') {
        return res.status(400).json({ message: "Question is required" });
      }

      // Save user message
      const userMessage = await storage.insertChatMessage({
        userId,
        role: 'user',
        content: question,
        sources: null,
      });

      // Generate embedding for the question
      const questionEmbeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: question,
      });
      const questionEmbedding = questionEmbeddingResponse.data[0].embedding;

      // Search for relevant document chunks using vector similarity
      const relevantChunks = await storage.searchDocumentChunks(question, questionEmbedding);
      
      // Build context from relevant chunks
      const context = relevantChunks.map(chunk => chunk.chunkText).join('\n\n');

      // Generate AI response using OpenAI
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a helpful documentation assistant for ContractPodAI, a contract lifecycle management platform. Answer questions based on the provided documentation context. If the context doesn't contain relevant information, say so clearly. Format your responses in markdown for better readability.`
          },
          {
            role: "user",
            content: `Context from documentation:\n${context}\n\nQuestion: ${question}`
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const aiResponse = completion.choices[0]?.message?.content || "I couldn't generate a response.";

      // Build sources from relevant chunks with actual document names
      const sources = await Promise.all(
        relevantChunks.map(async (chunk, index) => {
          const doc = await storage.getDocument(chunk.documentId);
          return {
            id: `source-${index}`,
            filename: doc?.originalFilename || "Documentation",
            page: chunk.pageNumber ? parseInt(chunk.pageNumber) : undefined,
            url: `/documents/${chunk.documentId}`,
          };
        })
      );

      // Save assistant message
      const assistantMessage = await storage.insertChatMessage({
        userId,
        role: 'assistant',
        content: aiResponse,
        sources: sources.length > 0 ? sources : null,
      });

      res.json({
        userMessage,
        assistantMessage,
      });
    } catch (error) {
      console.error("Error processing chat message:", error);
      res.status(500).json({ message: "Failed to process message" });
    }
  });

  // Document routes (admin only)
  app.get('/api/documents', isAuthenticated, async (_req, res) => {
    try {
      const docs = await storage.getDocuments();
      res.json(docs);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.post('/api/documents/upload', isAuthenticated, isAdmin, upload.array('files', 10), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const uploadedDocs = [];

      for (const file of files) {
        let textContent = '';

        // Extract text based on file type
        if (file.originalname.endsWith('.pdf')) {
          const dataBuffer = await fs.readFile(file.path);
          const pdfData = await pdfParse(dataBuffer);
          textContent = pdfData.text;
        } else if (file.originalname.endsWith('.txt') || file.originalname.endsWith('.md')) {
          textContent = await fs.readFile(file.path, 'utf-8');
        }

        // Save document metadata
        const doc = await storage.insertDocument({
          filename: file.filename,
          originalFilename: file.originalname,
          fileType: path.extname(file.originalname).toUpperCase().slice(1),
          fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
          filePath: file.path,
          uploadedBy: userId,
          textContent,
          embeddings: null, // Will be populated with vector embeddings
        });

        // Create chunks and generate embeddings
        if (textContent) {
          const chunks = textContent.match(/.{1,1000}/g) || [];
          
          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            
            // Generate embedding using OpenAI
            try {
              const embeddingResponse = await openai.embeddings.create({
                model: "text-embedding-3-small",
                input: chunk,
              });
              
              const embedding = embeddingResponse.data[0].embedding;
              
              await storage.insertDocumentChunk({
                documentId: doc.id,
                chunkText: chunk,
                chunkIndex: i.toString(),
                embedding: embedding as any,
                pageNumber: null,
              });
            } catch (embedError) {
              console.error("Error generating embedding:", embedError);
              // Continue without embedding if there's an error
              await storage.insertDocumentChunk({
                documentId: doc.id,
                chunkText: chunk,
                chunkIndex: i.toString(),
                embedding: null,
                pageNumber: null,
              });
            }
          }
        }

        uploadedDocs.push(doc);
      }

      res.json(uploadedDocs);
    } catch (error) {
      console.error("Error uploading documents:", error);
      res.status(500).json({ message: "Failed to upload documents" });
    }
  });

  app.delete('/api/documents/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const doc = await storage.getDocument(id);
      
      if (!doc) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Delete file from disk
      try {
        await fs.unlink(doc.filePath);
      } catch (err) {
        console.error("Error deleting file:", err);
      }

      // Delete from database (chunks will be cascade deleted)
      await storage.deleteDocument(id);
      
      res.json({ message: "Document deleted successfully" });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
