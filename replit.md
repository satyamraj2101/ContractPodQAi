# ContractPodAI Documentation Assistant

## Overview

ContractPodAI Documentation Assistant is an internal AI-powered chatbot application designed to help users quickly find accurate information from ContractPodAI's CLM platform documentation. The application allows users to upload documentation files (PDF, PPT, XLSX, TXT, MD, HTML) which are processed and embedded for semantic search. Users can then ask questions and receive AI-generated responses with source citations linking back to the original documents.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- **React 18** with TypeScript for type-safe component development
- **Vite** as the build tool and development server with HMR support
- **Wouter** for lightweight client-side routing
- **TanStack Query (React Query)** for server state management and caching

**UI Component System**
- **Radix UI** primitives for accessible, unstyled components
- **shadcn/ui** component library with customized "new-york" style
- **Tailwind CSS** for utility-first styling with custom design tokens
- **Dark/Light mode** support with persistent theme preference

**Design System**
- Custom color palette inspired by Linear, Notion, and Slack
- HSL-based color system with CSS variables for theme switching
- Utility classes for elevation states (`hover-elevate`, `active-elevate-2`)
- Typography using Inter for UI text and JetBrains Mono for code

### Backend Architecture

**Server Framework**
- **Express.js** with TypeScript for API routes and middleware
- **Session-based authentication** using express-session with PostgreSQL store
- RESTful API design with error handling middleware
- File upload handling via **Multer** with type and size validation

**AI Integration**
- **Google Gemini AI** (`@google/generative-ai`) for natural language processing
- **Automatic Failover System** - Tiered model fallback on rate limits (gemini-2.5-flash → gemini-2.5-flash-lite → gemini-2.0-flash-exp → gemini-1.5-flash → gemini-1.5-pro)
- **Conversation Memory** - Last 10 messages included as context for follow-up questions
- Document processing pipeline:
  1. File upload and validation
  2. Text extraction (PDF via pdf-parse, DOCX via mammoth, XLSX via xlsx)
  3. Text chunking for optimal embedding
  4. Vector embedding generation
  5. Storage in database with embeddings
- RAG (Retrieval Augmented Generation) pattern for context-aware responses

**Authentication**
- **Email/Password Authentication** - bcrypt password hashing, admin-controlled user provisioning
- **Session Management** - express-session with PostgreSQL store (connect-pg-simple)
- **Role-Based Access Control** - Admin flags for privileged operations
- **Password Reset Flow** - User requests, admin approves with optional notes
- **Email Case-Insensitive Login** - All emails normalized to lowercase in storage layer for consistent lookup
- **Secure Practices** - httpOnly cookies, server-side hashing, session timeouts

### Data Storage

**Database**
- **PostgreSQL** via Neon serverless with WebSocket support
- **Drizzle ORM** for type-safe database queries and schema management
- Connection pooling for efficient resource usage

**Schema Design**
- `users` - User profiles with email, hashed passwords, employee IDs, mobile, admin flags, active status
- `sessions` - Express session storage via connect-pg-simple
- `conversations` - User conversation containers (5 max per user)
- `conversationMessages` - Individual messages within conversations with role (user/assistant)
- `passwordResetRequests` - Admin-approved password reset workflow with notes
- `loginHistory` - User login tracking with timestamps, IP addresses, and user agents
- `feedbacks` - Message-specific feedback (helpful/not helpful ratings on AI responses)
- `feedbackSubmissions` - General user feedback with optional file attachments (screenshots, documents)
- `documents` - Uploaded file metadata with uploadedAt timestamp
- `documentChunks` - Chunked text with embeddings for vector search

**Data Flow**
1. User uploads document → stored in uploads directory
2. Document metadata → inserted into documents table
3. Text extraction → chunked and embedded → stored in documentChunks
4. User question → embedded → semantic search → retrieve relevant chunks
5. Chunks + question → sent to Gemini → AI response with citations
6. Message exchange → stored in conversationMessages table with conversation context

### Key Features

**User Management**
- Admin-controlled user provisioning (create users with full profile data)
- User activation/deactivation by admins
- User deletion by admins
- Profile editing (name, employee ID, mobile)
- Password change (requires current password verification)

**Password Reset Flow**
- Users request password reset with email
- Admins review pending requests in Admin Panel
- Admins approve or reject with optional notes
- Approved resets allow user to set new password
- Security: Admin approval required for all resets

**Conversation System**
- 5 conversations maximum per user
- Create new conversations automatically on first message
- Delete conversations
- Messages stored with conversation context
- Conversation-based chat history

**Admin Panel**
- User management: create, activate/deactivate, delete users
- Password reset approvals: review pending requests, approve/reject with notes
- Activity tracking: 30-day rolling window of user actions
- Feedback viewing: see all user feedback on AI responses

**Activity Tracking**
- Track login events
- Track message sent events
- Track document uploads
- 30-day rolling retention
- Admin visibility into user engagement

**Feedback System**
- **Message Ratings** - Users can rate AI responses (helpful/not helpful) with optional notes
- **General Feedback Submissions** - Users can submit feedback with optional file attachments (screenshots, documents)
- **Admin Review** - Admins can view all feedback, update status, and download attachments
- Admin visibility for quality monitoring and issue tracking

### External Dependencies

**AI & ML Services**
- **Google Gemini AI API** - Natural language understanding and generation
- Free tier operation using `gemini-1.5-flash` model
- Embedding generation for semantic search (text-embedding-004)
- Context-aware response generation with source attribution
- Vector similarity threshold: 0.6 for relevant chunk retrieval

**Database**
- **Neon PostgreSQL** - Serverless PostgreSQL database
- WebSocket support for real-time connections
- Automatic scaling and connection pooling
- Session storage via connect-pg-simple

**Authentication**
- **Custom Email/Password** - bcrypt hashing, session-based auth
- No external OAuth dependencies
- Admin-controlled user lifecycle

**Development Tools**
- **Replit-specific plugins** - Cartographer, dev banner, runtime error overlay
- Enhanced development experience within Replit environment

**File Processing Libraries**
- **pdf-parse** - PDF text extraction
- **mammoth** - DOCX to HTML/text conversion
- **xlsx** - Excel file parsing
- **react-markdown** - Markdown rendering in chat messages

**UI Libraries**
- **Radix UI** - Headless accessible components
- **Lucide React** - Icon system
- **date-fns** - Date formatting and manipulation
- **cmdk** - Command menu component