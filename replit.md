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
- Document processing pipeline:
  1. File upload and validation
  2. Text extraction (PDF via pdf-parse, DOCX via mammoth, XLSX via xlsx)
  3. Text chunking for optimal embedding
  4. Vector embedding generation
  5. Storage in database with embeddings
- RAG (Retrieval Augmented Generation) pattern for context-aware responses

**Authentication**
- **Replit Auth** integration using OpenID Connect
- Passport.js strategy for OAuth flow
- Role-based access control with admin permissions
- Secure session management with httpOnly cookies

### Data Storage

**Database**
- **PostgreSQL** via Neon serverless with WebSocket support
- **Drizzle ORM** for type-safe database queries and schema management
- Connection pooling for efficient resource usage

**Schema Design**
- `users` - User profiles with admin flags
- `sessions` - Express session storage
- `documents` - Uploaded file metadata
- `documentChunks` - Chunked text with embeddings for vector search
- `chatMessages` - Conversation history with user associations

**Data Flow**
1. User uploads document → stored in uploads directory
2. Document metadata → inserted into documents table
3. Text extraction → chunked and embedded → stored in documentChunks
4. User question → embedded → semantic search → retrieve relevant chunks
5. Chunks + question → sent to Gemini → AI response with citations
6. Message exchange → stored in chatMessages table

### External Dependencies

**AI & ML Services**
- **Google Gemini AI API** - Natural language understanding and generation
- Embedding generation for semantic search
- Context-aware response generation with source attribution

**Database**
- **Neon PostgreSQL** - Serverless PostgreSQL database
- WebSocket support for real-time connections
- Automatic scaling and connection pooling

**Authentication**
- **Replit Auth (OpenID Connect)** - User authentication service
- OAuth 2.0 flow with JWT tokens
- User profile data retrieval

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