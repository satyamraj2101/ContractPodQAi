// Routes implementation - see blueprint:javascript_log_in_with_replit
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./auth";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { createRequire } from 'module';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { insertChatMessageSchema, insertDocumentSchema } from "@shared/schema";
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { load } from 'cheerio';
import { PDFDocument } from 'pdf-lib';
import PizZip from 'pizzip';

const require = createRequire(import.meta.url);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Helper function to convert URL/file to base64
async function imageToBase64(imagePath: string, htmlFilePath?: string): Promise<string | null> {
  try {
    if (imagePath.startsWith('data:image')) {
      return imagePath; // Already base64
    } else if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      // Download external image using built-in fetch
      const response = await fetch(imagePath);
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const contentType = response.headers.get('content-type') || 'image/png';
      return `data:${contentType};base64,${base64}`;
    } else if (htmlFilePath) {
      // Handle relative path
      const htmlDir = path.dirname(htmlFilePath);
      const absolutePath = path.resolve(htmlDir, imagePath);
      try {
        const imageBuffer = await fs.readFile(absolutePath);
        const ext = path.extname(imagePath).toLowerCase();
        const mimeType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 
                        ext === '.png' ? 'image/png' : 
                        ext === '.gif' ? 'image/gif' : 'image/png';
        return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
      } catch (err) {
        console.error(`Could not read relative image: ${absolutePath}`);
        return null;
      }
    }
    return null;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    return null;
  }
}

// Helper function to extract images from HTML files
async function extractImagesFromHTML(filePath: string, documentId: string): Promise<{ imagePath: string, context: string }[]> {
  const htmlContent = await fs.readFile(filePath, 'utf-8');
  const $ = load(htmlContent);
  const images: { imagePath: string, context: string }[] = [];
  
  const imagePromises: Promise<void>[] = [];
  
  $('img').each((index, element) => {
    const src = $(element).attr('src');
    const alt = $(element).attr('alt') || '';
    const title = $(element).attr('title') || '';
    
    // Get surrounding text context
    const parent = $(element).parent();
    const nearbyText = parent.text().replace(/\s+/g, ' ').trim();
    const context = `Image: ${alt} ${title}. Context: ${nearbyText}`.trim().slice(0, 500);
    
    if (src) {
      // Convert all images to base64 for processing
      const promise = imageToBase64(src, filePath).then(base64 => {
        if (base64) {
          images.push({ imagePath: base64, context });
        }
      }).catch(err => {
        console.error(`Failed to process image ${src}:`, err);
      });
      imagePromises.push(promise);
    }
  });
  
  // Wait for all image conversions to complete
  await Promise.all(imagePromises);
  
  return images;
}

// Helper function to extract images from PDF files
async function extractImagesFromPDF(filePath: string, documentId: string): Promise<{ imagePath: string, context: string }[]> {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const pdfDoc = await PDFDocument.load(dataBuffer);
    const images: { imagePath: string, context: string }[] = [];
    
    // PDF image extraction is complex - for now, we'll note that images exist
    // A full implementation would use pdf.js or similar to extract actual image data
    const pageCount = pdfDoc.getPageCount();
    
    // Placeholder for PDF image extraction
    // In production, you'd use a library like pdf2pic or pdf.js
    
    return images;
  } catch (error) {
    console.error('Error extracting images from PDF:', error);
    return [];
  }
}

// Helper function to extract images from DOCX files
async function extractImagesFromDOCX(filePath: string, documentId: string): Promise<{ imagePath: string, context: string }[]> {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const zip = new PizZip(dataBuffer);
    const images: { imagePath: string, context: string }[] = [];
    
    // Extract images from word/media/ folder
    const mediaFiles = Object.keys(zip.files).filter(name => name.startsWith('word/media/'));
    
    for (const mediaFile of mediaFiles) {
      const imageData = zip.files[mediaFile].asNodeBuffer();
      const ext = path.extname(mediaFile).toLowerCase();
      const mimeType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                      ext === '.png' ? 'image/png' :
                      ext === '.gif' ? 'image/gif' :
                      ext === '.bmp' ? 'image/bmp' :
                      ext === '.webp' ? 'image/webp' : 'image/png';
      const base64Image = `data:${mimeType};base64,${imageData.toString('base64')}`;
      images.push({ imagePath: base64Image, context: `Image from DOCX document: ${path.basename(mediaFile)}` });
    }
    
    return images;
  } catch (error) {
    console.error('Error extracting images from DOCX:', error);
    return [];
  }
}

// Helper function to extract images from PPTX files
async function extractImagesFromPPTX(filePath: string, documentId: string): Promise<{ imagePath: string, context: string }[]> {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const zip = new PizZip(dataBuffer);
    const images: { imagePath: string, context: string }[] = [];
    
    // Extract images from ppt/media/ folder
    const mediaFiles = Object.keys(zip.files).filter(name => name.startsWith('ppt/media/'));
    
    for (const mediaFile of mediaFiles) {
      const imageData = zip.files[mediaFile].asNodeBuffer();
      const ext = path.extname(mediaFile).toLowerCase();
      const mimeType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                      ext === '.png' ? 'image/png' :
                      ext === '.gif' ? 'image/gif' :
                      ext === '.bmp' ? 'image/bmp' :
                      ext === '.webp' ? 'image/webp' : 'image/png';
      const base64Image = `data:${mimeType};base64,${imageData.toString('base64')}`;
      images.push({ imagePath: base64Image, context: `Slide image from PowerPoint: ${path.basename(mediaFile)}` });
    }
    
    return images;
  } catch (error) {
    console.error('Error extracting images from PPTX:', error);
    return [];
  }
}

// Helper function to describe an image using Gemini Vision API
async function describeImageWithGemini(imageData: string): Promise<string> {
  try {
    const visionModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    
    // Convert base64 image to the format Gemini expects
    const imageParts = [{
      inlineData: {
        data: imageData.split(',')[1], // Remove data:image/...;base64, prefix
        mimeType: imageData.match(/data:([^;]+)/)?.[1] || 'image/png',
      },
    }];
    
    const prompt = "Describe this image in detail, focusing on UI elements, interface components, navigation elements, buttons, menus, text, and any other important visual elements. This description will help users understand website navigation and interface layout.";
    
    const result = await visionModel.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error describing image with Gemini:', error);
    return 'Unable to generate image description';
  }
}

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['.pdf', '.ppt', '.pptx', '.docx', '.txt', '.md', '.xlsx', '.xls', '.html', '.htm'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, PPT, PPTX, DOCX, TXT, MD, XLSX, XLS, HTML, and HTM files are allowed.'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes are now in auth.ts

  // Chat message routes
  app.get('/api/chat/history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      
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
      const userId = (req.user as any).id;
      const { question, conversationId } = req.body;

      if (!question || typeof question !== 'string') {
        return res.status(400).json({ message: "Question is required" });
      }

      // Get or create conversation
      let conversation;
      if (conversationId) {
        // Use existing conversation
        conversation = await storage.getConversation(conversationId);
        if (!conversation || conversation.userId !== userId) {
          return res.status(404).json({ message: "Conversation not found" });
        }
      } else {
        // Check if user has reached conversation limit (5 active conversations)
        const activeCount = await storage.countUserActiveConversations(userId);
        if (activeCount >= 5) {
          return res.status(400).json({ 
            message: "You have reached the maximum of 5 active conversations. Please delete an old conversation to start a new one.",
            error: "conversation_limit_reached"
          });
        }

        // Create new conversation with title from first few words of question
        const title = question.length > 50 ? question.substring(0, 47) + '...' : question;
        conversation = await storage.createConversation({
          userId,
          title,
          isActive: true,
        });
      }

      // Save user message
      const userMessage = await storage.insertChatMessage({
        conversationId: conversation.id,
        userId,
        role: 'user',
        content: question,
        sources: null,
      });

      // Generate embedding for the question using Gemini
      const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
      const questionEmbeddingResult = await embeddingModel.embedContent(question);
      const questionEmbedding = questionEmbeddingResult.embedding.values;

      // Search for relevant document chunks using vector similarity
      const relevantChunks = await storage.searchDocumentChunks(question, questionEmbedding);
      
      // Build context from relevant chunks
      const context = relevantChunks.map((chunk: any) => chunk.chunkText).join('\n\n');
      
      // Determine if we have relevant context (non-empty and meaningful)
      const hasRelevantContext = context.trim().length > 0 && relevantChunks.length > 0;

      // Generate AI response using Gemini
      const chatModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const prompt = hasRelevantContext 
        ? `You are a helpful documentation assistant for ContractPodAI, a contract lifecycle management platform. Answer questions based on the provided documentation context. If the context doesn't contain relevant information, say so clearly. Format your responses in markdown for better readability.

Context from documentation:
${context}

Question: ${question}`
        : `You are a helpful documentation assistant for ContractPodAI, a contract lifecycle management platform. The user asked a question but no relevant documentation was found in the knowledge base.

Please politely inform the user that you don't have information about their question in the available documentation, and suggest they:
1. Try rephrasing their question
2. Check if the documentation has been uploaded
3. Contact the admin if they believe relevant documents are missing

Question: ${question}`;

      const result = await chatModel.generateContent(prompt);
      const aiResponse = result.response.text() || "I couldn't generate a response.";

      // Only build sources if we found relevant context
      const sources = hasRelevantContext ? await Promise.all(
        relevantChunks.map(async (chunk: any, index: number) => {
          const doc = await storage.getDocument(chunk.documentId);
          return {
            id: `source-${index}`,
            filename: doc?.originalFilename || "Documentation",
            page: chunk.pageNumber ? parseInt(chunk.pageNumber) : undefined,
            url: `/api/documents/${chunk.documentId}`,
          };
        })
      ) : [];

      // Save assistant message
      const assistantMessage = await storage.insertChatMessage({
        conversationId: conversation.id,
        userId,
        role: 'assistant',
        content: aiResponse,
        sources: sources.length > 0 ? sources : null,
      });

      // Update conversation's updatedAt timestamp
      await storage.updateConversation(conversation.id, {
        userId: conversation.userId,
        title: conversation.title,
        isActive: conversation.isActive,
      });

      res.json({
        userMessage,
        assistantMessage,
        conversationId: conversation.id,
      });
    } catch (error: any) {
      console.error("Error processing chat message:", error);
      
      // Handle Gemini API errors specifically
      if (error?.status === 429 || error?.message?.includes('quota')) {
        return res.status(429).json({ 
          message: "Gemini API quota exceeded. Please check your API key.",
          error: "quota_exceeded"
        });
      }
      
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
      const userId = (req.user as any).id;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const uploadedDocs = [];

      for (const file of files) {
        let textContent = '';
        const ext = path.extname(file.originalname).toLowerCase();

        try {
          // Extract text based on file type
          if (ext === '.pdf') {
            const dataBuffer = await fs.readFile(file.path);
            const pdfParse = require('pdf-parse');
            const pdfData = await pdfParse(dataBuffer);
            textContent = pdfData.text;
          } else if (ext === '.txt' || ext === '.md') {
            textContent = await fs.readFile(file.path, 'utf-8');
          } else if (ext === '.xlsx' || ext === '.xls') {
            const dataBuffer = await fs.readFile(file.path);
            const workbook = XLSX.read(dataBuffer, { type: 'buffer' });
            const sheets = workbook.SheetNames.map(name => {
              const sheet = workbook.Sheets[name];
              return XLSX.utils.sheet_to_txt(sheet);
            });
            textContent = sheets.join('\n\n');
          } else if (ext === '.html' || ext === '.htm') {
            const htmlContent = await fs.readFile(file.path, 'utf-8');
            // Basic HTML tag stripping (for better parsing, consider using a library like cheerio)
            textContent = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          } else if (ext === '.docx') {
            const dataBuffer = await fs.readFile(file.path);
            const result = await mammoth.extractRawText({ buffer: dataBuffer });
            textContent = result.value;
          } else if (ext === '.ppt' || ext === '.pptx') {
            const officeparser = require('officeparser');
            textContent = await new Promise((resolve, reject) => {
              officeparser.parseOffice(file.path, (err: Error, data: string) => {
                if (err) {
                  console.error('Error parsing PowerPoint:', err);
                  resolve(`[Error extracting text from PowerPoint: ${file.originalname}]`);
                } else {
                  resolve(data || `[No text content found in PowerPoint: ${file.originalname}]`);
                }
              });
            });
          }
        } catch (parseError) {
          console.error(`Error parsing file ${file.originalname}:`, parseError);
          textContent = `[Error parsing file: ${file.originalname}]`;
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
            
            // Generate embedding using Gemini
            try {
              const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
              const embeddingResult = await embeddingModel.embedContent(chunk);
              const embedding = embeddingResult.embedding.values;
              
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

        // Extract and process images from the document
        try {
          let extractedImages: { imagePath: string, context: string }[] = [];
          
          // Extract images based on file type
          if (ext === '.html' || ext === '.htm') {
            extractedImages = await extractImagesFromHTML(file.path, doc.id);
          } else if (ext === '.pdf') {
            extractedImages = await extractImagesFromPDF(file.path, doc.id);
          } else if (ext === '.docx') {
            extractedImages = await extractImagesFromDOCX(file.path, doc.id);
          } else if (ext === '.ppt' || ext === '.pptx') {
            extractedImages = await extractImagesFromPPTX(file.path, doc.id);
          }
          
          // Process each extracted image (all should be base64 at this point)
          let processedImageCount = 0;
          for (let imgIndex = 0; imgIndex < extractedImages.length; imgIndex++) {
            const { imagePath, context } = extractedImages[imgIndex];
            
            try {
              // All images should be base64 after extraction
              if (!imagePath.startsWith('data:image')) {
                console.warn(`⚠ Skipping non-base64 image at index ${imgIndex}`);
                continue;
              }
              
              // Generate AI description using Gemini Vision
              console.log(`Processing image ${imgIndex + 1}/${extractedImages.length} from ${file.originalname}`);
              const aiDescription = await describeImageWithGemini(imagePath);
              
              // Store image metadata and description
              await storage.insertDocumentImage({
                documentId: doc.id,
                imagePath: imagePath,
                imageIndex: imgIndex.toString(),
                aiDescription,
                imageContext: context,
                embedding: null,
              });
              
              // Generate embedding for the AI description and add as searchable chunk
              try {
                const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
                const descriptionText = `[IMAGE DESCRIPTION]: ${aiDescription}\n[CONTEXT]: ${context}`;
                const embeddingResult = await embeddingModel.embedContent(descriptionText);
                const embedding = embeddingResult.embedding.values;
                
                // Add image description as a searchable chunk
                await storage.insertDocumentChunk({
                  documentId: doc.id,
                  chunkText: descriptionText,
                  chunkIndex: `image_${imgIndex}`,
                  embedding: embedding as any,
                  pageNumber: null,
                });
                
                processedImageCount++;
                console.log(`✓ Processed image ${imgIndex + 1} from ${file.originalname}`);
              } catch (embedError) {
                console.error(`✗ Error generating embedding for image ${imgIndex}:`, embedError);
              }
            } catch (imageError) {
              console.error(`✗ Error processing image ${imgIndex} from ${file.originalname}:`, imageError);
            }
          }
          
          if (extractedImages.length > 0) {
            console.log(`📸 Extracted ${extractedImages.length} images from ${file.originalname} (${processedImageCount} with AI descriptions)`);
          }
        } catch (imageExtractionError) {
          console.error("Error during image extraction:", imageExtractionError);
          // Continue even if image extraction fails
        }

        uploadedDocs.push(doc);
      }

      res.json(uploadedDocs);
    } catch (error) {
      console.error("Error uploading documents:", error);
      res.status(500).json({ message: "Failed to upload documents" });
    }
  });

  app.get('/api/documents/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const doc = await storage.getDocument(id);
      
      if (!doc) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Send the file for download
      res.download(doc.filePath, doc.originalFilename, (err) => {
        if (err) {
          console.error("Error downloading file:", err);
          if (!res.headersSent) {
            res.status(500).json({ message: "Failed to download document" });
          }
        }
      });
    } catch (error) {
      console.error("Error retrieving document:", error);
      res.status(500).json({ message: "Failed to retrieve document" });
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

  // Conversation routes
  app.get('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const conversations = await storage.getUserConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.get('/api/conversations/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const { id } = req.params;
      const conversation = await storage.getConversation(id);
      
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      const messages = await storage.getConversationMessages(id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching conversation messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.delete('/api/conversations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const { id } = req.params;
      const conversation = await storage.getConversation(id);
      
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      await storage.deleteConversation(id);
      res.json({ message: "Conversation deleted successfully" });
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ message: "Failed to delete conversation" });
    }
  });

  // Password reset request routes
  app.post('/api/password-reset/request', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const { newPassword, reason } = req.body;

      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ message: "New password is required and must be at least 8 characters" });
      }

      // Hash the new password server-side (NEVER accept pre-hashed passwords)
      const bcrypt = require("bcryptjs");
      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      // Create password reset request
      const request = await storage.createPasswordResetRequest({
        userId,
        newPasswordHash,
        status: 'pending',
      });

      res.json({ 
        message: "Password change request submitted. An admin will review it shortly.",
        requestId: request.id
      });
    } catch (error) {
      console.error("Error submitting password reset request:", error);
      res.status(500).json({ message: "Failed to submit password reset request" });
    }
  });

  app.get('/api/admin/password-resets', isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const requests = await storage.getPasswordResetRequests();
      res.json(requests);
    } catch (error) {
      console.error("Error fetching password reset requests:", error);
      res.status(500).json({ message: "Failed to fetch password reset requests" });
    }
  });

  app.post('/api/admin/password-resets/:id/approve', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const adminId = (req.user as any).id;
      const { id } = req.params;
      const { note } = req.body;

      const resetRequest = await storage.getPasswordResetRequests();
      const request = resetRequest.find(r => r.id === id);

      if (!request) {
        return res.status(404).json({ message: "Password reset request not found" });
      }

      // Update user's password
      await storage.updateUser(request.userId, {
        passwordHash: request.newPasswordHash,
      });

      // Update request status
      await storage.updatePasswordResetRequest(id, {
        status: 'approved',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        reviewNote: note || 'Approved by admin',
      });

      res.json({ message: "Password reset request approved and password updated" });
    } catch (error) {
      console.error("Error approving password reset:", error);
      res.status(500).json({ message: "Failed to approve password reset" });
    }
  });

  app.post('/api/admin/password-resets/:id/reject', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const adminId = (req.user as any).id;
      const { id } = req.params;
      const { note } = req.body;

      // Update request status
      await storage.updatePasswordResetRequest(id, {
        status: 'rejected',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        reviewNote: note || 'Rejected by admin',
      });

      res.json({ message: "Password reset request rejected" });
    } catch (error) {
      console.error("Error rejecting password reset:", error);
      res.status(500).json({ message: "Failed to reject password reset" });
    }
  });

  // User management routes (admin only)
  app.get('/api/admin/users', isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Don't send password hashes
      const safeUsers = users.map(u => ({
        ...u,
        passwordHash: undefined,
      }));
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post('/api/admin/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { email, password, firstName, lastName, isAdmin, employeeId, mobile } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Check if user already exists
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      const bcrypt = require("bcryptjs");
      const passwordHash = await bcrypt.hash(password, 10);

      const user = await storage.createUser({
        email,
        passwordHash,
        firstName,
        lastName,
        isAdmin: isAdmin || false,
        isActive: true,
        employeeId,
        mobile,
      });

      res.json({ 
        message: "User created successfully",
        user: { ...user, passwordHash: undefined }
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch('/api/admin/users/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { email, firstName, lastName, isAdmin, isActive, employeeId, mobile } = req.body;

      const user = await storage.updateUser(id, {
        email,
        firstName,
        lastName,
        isAdmin,
        isActive,
        employeeId,
        mobile,
      });

      res.json({
        message: "User updated successfully",
        user: { ...user, passwordHash: undefined }
      });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.post('/api/admin/users/:id/change-password', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      if (!newPassword) {
        return res.status(400).json({ message: "New password is required" });
      }

      const bcrypt = require("bcryptjs");
      const passwordHash = await bcrypt.hash(newPassword, 10);

      await storage.updateUser(id, {
        passwordHash,
      });

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  app.get('/api/admin/users/:id/activity', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const stats = await storage.getUserActivityStats(id, 30);
      const logins = await storage.getUserLoginHistory(id, 10);
      res.json({ stats, recentLogins: logins });
    } catch (error) {
      console.error("Error fetching user activity:", error);
      res.status(500).json({ message: "Failed to fetch user activity" });
    }
  });

  // Feedback routes
  app.post('/api/feedback', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const { conversationId, messageId, feedbackType, feedbackText, rating } = req.body;

      if (!feedbackType) {
        return res.status(400).json({ message: "Feedback type is required" });
      }

      const feedback = await storage.createFeedback({
        userId,
        conversationId,
        messageId,
        feedbackType,
        feedbackText,
        rating,
      });

      res.json({ message: "Feedback submitted successfully", feedback });
    } catch (error) {
      console.error("Error submitting feedback:", error);
      res.status(500).json({ message: "Failed to submit feedback" });
    }
  });

  app.get('/api/admin/feedback', isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const feedbacks = await storage.getAllFeedbacks();
      res.json(feedbacks);
    } catch (error) {
      console.error("Error fetching feedbacks:", error);
      res.status(500).json({ message: "Failed to fetch feedbacks" });
    }
  });

  // User profile routes
  app.patch('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const { firstName, lastName, employeeId, mobile } = req.body;

      const user = await storage.updateUser(userId, {
        firstName,
        lastName,
        employeeId,
        mobile,
      });

      res.json({
        message: "Profile updated successfully",
        user: { ...user, passwordHash: undefined }
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.post('/api/profile/change-password', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new passwords are required" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.passwordHash) {
        return res.status(400).json({ message: "User not found or password not set" });
      }

      const bcrypt = require("bcryptjs");
      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(userId, {
        passwordHash: newPasswordHash,
      });

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
