# Database Schema Documentation

This document provides a comprehensive overview of the database schema for the ContractPodAI Documentation Assistant application.

## Technology Stack

- **Database**: PostgreSQL (Neon Serverless)
- **ORM**: Drizzle ORM with TypeScript
- **Migration Tool**: drizzle-kit

## Schema Overview

The application uses 10 main tables to manage users, authentication, conversations, documents, and activity tracking.

---

## Tables

### 1. `sessions`
Session storage for Express session management using `connect-pg-simple`.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `sid` | VARCHAR | PRIMARY KEY | Session ID (unique identifier) |
| `sess` | JSONB | NOT NULL | Session data stored as JSON |
| `expire` | TIMESTAMP | NOT NULL | Session expiration timestamp |

**Indexes:**
- `IDX_session_expire` on `expire` (for efficient cleanup of expired sessions)

---

### 2. `users`
Core user table with authentication and profile information.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | VARCHAR | PRIMARY KEY | `gen_random_uuid()` | Unique user identifier (UUID) |
| `email` | VARCHAR | UNIQUE, NOT NULL | - | User email address (used for login) |
| `password_hash` | VARCHAR | - | - | Bcrypt hashed password |
| `first_name` | VARCHAR | - | - | User's first name |
| `last_name` | VARCHAR | - | - | User's last name |
| `employee_id` | VARCHAR | - | - | Employee/staff identifier |
| `mobile` | VARCHAR | - | - | Mobile phone number |
| `profile_pic_url` | VARCHAR | - | - | URL to profile picture |
| `is_admin` | BOOLEAN | NOT NULL | `false` | Admin flag for privileged access |
| `is_active` | BOOLEAN | NOT NULL | `true` | Account active status |
| `created_at` | TIMESTAMP | - | `NOW()` | Account creation timestamp |
| `updated_at` | TIMESTAMP | - | `NOW()` | Last update timestamp |

**Key Features:**
- Email/password authentication with bcrypt hashing
- Admin role-based access control
- User activation/deactivation support

---

### 3. `password_reset_requests`
Admin-approved password reset workflow.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | VARCHAR | PRIMARY KEY | `gen_random_uuid()` | Request ID |
| `user_id` | VARCHAR | NOT NULL, FK → users.id | - | User requesting password reset |
| `new_password_hash` | VARCHAR | NOT NULL | - | Pre-hashed new password |
| `status` | VARCHAR | NOT NULL | `'pending'` | Request status: 'pending', 'approved', 'rejected' |
| `requested_at` | TIMESTAMP | NOT NULL | `NOW()` | Request submission time |
| `reviewed_by` | VARCHAR | FK → users.id | - | Admin who reviewed the request |
| `reviewed_at` | TIMESTAMP | - | - | Review timestamp |
| `review_note` | TEXT | - | - | Admin notes on approval/rejection |

**Indexes:**
- `idx_password_reset_user_id` on `user_id`
- `idx_password_reset_status` on `status`

**Foreign Key Actions:**
- `user_id` → CASCADE on delete (if user deleted, requests are deleted)
- `reviewed_by` → RESTRICT on delete (prevents deletion of admin if they've reviewed requests)

**Workflow:**
1. User requests password reset (status: 'pending')
2. Admin reviews in Admin Panel
3. Admin approves/rejects with optional notes
4. If approved, user's password is updated and request marked 'approved'

---

### 4. `login_history`
Activity tracking for user logins (30-day retention).

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | VARCHAR | PRIMARY KEY | `gen_random_uuid()` | Login record ID |
| `user_id` | VARCHAR | NOT NULL, FK → users.id | - | User who logged in |
| `login_at` | TIMESTAMP | NOT NULL | `NOW()` | Login timestamp |
| `ip_address` | VARCHAR | - | - | Client IP address |
| `user_agent` | VARCHAR | - | - | Browser/client user agent |

**Indexes:**
- `idx_login_history_user_id` on `user_id`
- `idx_login_history_login_at` on `login_at`

**Foreign Key Actions:**
- `user_id` → CASCADE on delete

**Usage:**
- Track user login activity
- Admin dashboard displays login counts and last login
- Automatic cleanup of records older than 30 days

---

### 5. `feedbacks`
User feedback on AI responses.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | VARCHAR | PRIMARY KEY | `gen_random_uuid()` | Feedback ID |
| `user_id` | VARCHAR | NOT NULL, FK → users.id | - | User who submitted feedback |
| `conversation_id` | VARCHAR | FK → conversations.id | - | Associated conversation (optional) |
| `message_id` | VARCHAR | FK → chat_messages.id | - | Specific message being rated (optional) |
| `feedback_type` | VARCHAR | NOT NULL | - | Type: 'positive', 'negative', 'suggestion' |
| `feedback_text` | TEXT | - | - | Optional detailed feedback text |
| `rating` | INTEGER | - | - | Optional 1-5 star rating |
| `submitted_at` | TIMESTAMP | NOT NULL | `NOW()` | Submission timestamp |

**Indexes:**
- `idx_feedbacks_user_id` on `user_id`
- `idx_feedbacks_submitted_at` on `submitted_at`

**Foreign Key Actions:**
- `user_id` → CASCADE on delete
- `conversation_id` → SET NULL on delete
- `message_id` → SET NULL on delete

**Usage:**
- Users can provide thumbs up/down on AI responses
- Admins view all feedback in Admin Panel
- Helps improve documentation and AI responses

---

### 6. `conversations`
Conversation grouping for chat history (max 5 per user).

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | VARCHAR | PRIMARY KEY | `gen_random_uuid()` | Conversation ID |
| `user_id` | VARCHAR | NOT NULL, FK → users.id | - | Conversation owner |
| `title` | VARCHAR | NOT NULL | - | Auto-generated from first message |
| `created_at` | TIMESTAMP | NOT NULL | `NOW()` | Creation timestamp |
| `updated_at` | TIMESTAMP | NOT NULL | `NOW()` | Last message timestamp |
| `is_active` | BOOLEAN | NOT NULL | `true` | Active status |

**Indexes:**
- `idx_conversations_user_id` on `user_id`
- `idx_conversations_created_at` on `created_at`

**Foreign Key Actions:**
- `user_id` → CASCADE on delete

**Business Rules:**
- Maximum 5 active conversations per user
- Title is first 50 characters of first message
- Users can delete old conversations to free slots

---

### 7. `documents`
Uploaded documentation files and metadata.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | VARCHAR | PRIMARY KEY | `gen_random_uuid()` | Document ID |
| `filename` | VARCHAR | NOT NULL | - | Stored filename (system-generated) |
| `original_filename` | VARCHAR | NOT NULL | - | Original uploaded filename |
| `file_type` | VARCHAR | NOT NULL | - | File extension (PDF, DOCX, etc.) |
| `file_size` | VARCHAR | NOT NULL | - | Formatted file size (e.g., "2.5 MB") |
| `file_path` | VARCHAR | NOT NULL | - | Server file path |
| `uploaded_by` | VARCHAR | NOT NULL, FK → users.id | - | Admin who uploaded |
| `upload_date` | TIMESTAMP | NOT NULL | `NOW()` | Upload timestamp |
| `text_content` | TEXT | - | - | Extracted and normalized text |
| `embeddings` | JSONB | - | - | Document-level embeddings (optional) |

**Foreign Key Actions:**
- `uploaded_by` → RESTRICT on delete (prevents deletion of admin who uploaded documents)

**Supported File Types:**
- PDF, DOCX, PPTX
- TXT, MD, HTML
- XLSX, XLS

**Processing Pipeline:**
1. File uploaded and stored in `uploads/` directory
2. Text extracted based on file type
3. Text normalized (remove spacing artifacts, control chars)
4. Chunked for embedding generation
5. Metadata and content stored in database

---

### 8. `chat_messages`
Individual messages within conversations.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | VARCHAR | PRIMARY KEY | `gen_random_uuid()` | Message ID |
| `conversation_id` | VARCHAR | NOT NULL, FK → conversations.id | - | Parent conversation |
| `user_id` | VARCHAR | NOT NULL, FK → users.id | - | Message author |
| `role` | VARCHAR | NOT NULL | - | Message role: 'user' or 'assistant' |
| `content` | TEXT | NOT NULL | - | Message content (markdown supported) |
| `sources` | JSONB | - | - | Array of source citations (for AI responses) |
| `timestamp` | TIMESTAMP | NOT NULL | `NOW()` | Message timestamp |

**Indexes:**
- `idx_chat_messages_conversation_id` on `conversation_id`
- `idx_chat_messages_user_id` on `user_id`
- `idx_chat_messages_timestamp` on `timestamp`

**Foreign Key Actions:**
- `conversation_id` → CASCADE on delete
- `user_id` → CASCADE on delete

**Sources Format (JSONB):**
```json
[
  {
    "id": "source-doc123",
    "filename": "User Guide.pdf",
    "page": 5,
    "url": "/api/documents/doc123"
  }
]
```

---

### 9. `document_chunks`
Text chunks with vector embeddings for semantic search.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | VARCHAR | PRIMARY KEY | `gen_random_uuid()` | Chunk ID |
| `document_id` | VARCHAR | NOT NULL, FK → documents.id | - | Parent document |
| `chunk_text` | TEXT | NOT NULL | - | Text chunk (1000 chars approx) |
| `chunk_index` | VARCHAR | NOT NULL | - | Sequential index or 'image_N' |
| `embedding` | JSONB | - | - | Vector embedding (768-dim array) |
| `page_number` | VARCHAR | - | - | Source page number (if available) |

**Indexes:**
- `idx_document_chunks_document_id` on `document_id`

**Foreign Key Actions:**
- `document_id` → CASCADE on delete

**Chunking Strategy:**
- Intelligent text chunking (~1000 chars per chunk)
- Preserves paragraph boundaries
- Chunks indexed sequentially (0, 1, 2, ...)
- Image descriptions stored as special chunks (image_0, image_1, ...)

**Embedding Model:**
- Google Gemini `text-embedding-004`
- 768-dimensional vectors
- Stored as JSON array in JSONB column

**Semantic Search:**
1. User question → embedded with Gemini
2. Cosine similarity with chunk embeddings
3. Top results above 0.6 threshold returned
4. Used as context for AI response

---

### 10. `document_images`
Extracted images with AI-generated descriptions.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | VARCHAR | PRIMARY KEY | `gen_random_uuid()` | Image record ID |
| `document_id` | VARCHAR | NOT NULL, FK → documents.id | - | Parent document |
| `image_path` | TEXT | NOT NULL | - | Base64 encoded image data |
| `image_index` | VARCHAR | NOT NULL | - | Sequential image index |
| `ai_description` | TEXT | - | - | Gemini Vision API description |
| `image_context` | TEXT | - | - | Surrounding text context |
| `embedding` | JSONB | - | - | Embedding of AI description |
| `extracted_at` | TIMESTAMP | NOT NULL | `NOW()` | Extraction timestamp |

**Indexes:**
- `idx_document_images_document_id` on `document_id`

**Foreign Key Actions:**
- `document_id` → CASCADE on delete

**Image Processing Pipeline:**
1. Extract images from documents (HTML, PDF, DOCX, PPTX)
2. Convert to base64 for storage
3. Generate AI description using Gemini Vision (gemini-2.0-flash-exp)
4. Create embedding from description
5. Store as searchable chunk in `document_chunks`

**Supported Source Types:**
- **HTML/HTM**: Extracts `<img>` tags with context
- **DOCX**: Extracts from `word/media/` folder
- **PPTX**: Extracts from `ppt/media/` folder
- **PDF**: Placeholder (complex, requires pdf.js)

---

## Relationships Diagram

```
users (1) ──┬─→ (N) password_reset_requests
            ├─→ (N) login_history
            ├─→ (N) feedbacks
            ├─→ (N) conversations
            ├─→ (N) chat_messages
            └─→ (N) documents

conversations (1) ─→ (N) chat_messages
                  ←─ (1) feedbacks

documents (1) ──┬─→ (N) document_chunks
                └─→ (N) document_images

chat_messages (1) ─→ (N) feedbacks (optional)
```

---

## Data Retention & Cleanup

### Automatic Cleanup
- **Chat Messages**: Older than 7 days (configurable)
- **Login History**: 30-day rolling window

### Manual Cleanup (Admin Actions)
- **Old Conversations**: Users can delete to free slots
- **Documents**: Admins can delete via Admin Panel
- **Inactive Password Resets**: Automatically filtered in UI

---

## Indexes Summary

**Primary Indexes (Primary Keys):**
- All tables have UUID-based primary keys

**Foreign Key Indexes:**
- `user_id` indexed in: password_reset_requests, login_history, feedbacks, conversations, chat_messages
- `conversation_id` indexed in: chat_messages
- `document_id` indexed in: document_chunks, document_images

**Query Optimization Indexes:**
- `sessions.expire` - efficient session cleanup
- `password_reset_requests.status` - filter pending requests
- `login_history.login_at` - time-based queries
- `feedbacks.submitted_at` - chronological sorting
- `conversations.created_at` - sorting conversations
- `chat_messages.timestamp` - message ordering

---

## Schema Migration

### Using Drizzle Kit

```bash
# Push schema changes to database
npm run db:push

# Generate migration files (manual approach)
npx drizzle-kit generate

# Apply migrations
npx drizzle-kit migrate
```

### Schema File Location
- `shared/schema.ts` - Drizzle ORM schema definitions
- TypeScript types auto-generated from schema

---

## Security Considerations

1. **Password Storage**: bcrypt hashing with salt rounds (never store plaintext)
2. **Session Security**: PostgreSQL-backed session store with httpOnly cookies
3. **Cascade Deletes**: Carefully configured to maintain referential integrity
4. **Input Validation**: Zod schemas validate all inserts/updates
5. **Sensitive Data**: Password hashes and reset requests properly isolated

---

## Best Practices

1. **Always use Drizzle ORM** for queries (avoid raw SQL)
2. **Validate inputs** with Zod schemas before database operations
3. **Use transactions** for multi-table operations
4. **Index frequently queried columns** (user_id, timestamps)
5. **Regular backups** of production database
6. **Monitor query performance** using PostgreSQL EXPLAIN

---

## Common Queries

### Get User with Conversations
```typescript
const userWithConversations = await db
  .select()
  .from(users)
  .leftJoin(conversations, eq(users.id, conversations.userId))
  .where(eq(users.id, userId));
```

### Get Conversation with Messages
```typescript
const conversationMessages = await db
  .select()
  .from(chatMessages)
  .where(eq(chatMessages.conversationId, conversationId))
  .orderBy(chatMessages.timestamp);
```

### Search Document Chunks (Semantic)
```typescript
// Custom function using vector similarity
const relevantChunks = await storage.searchDocumentChunks(
  question,
  questionEmbedding
);
```

### Get User Activity (30 days)
```typescript
const activity = await storage.getAllUsersActivity();
// Returns: loginCount, messageCount, conversationCount, lastLogin
```

---

## Environment Setup

Ensure these environment variables are set:

```env
DATABASE_URL=postgresql://user:password@host/database
PGHOST=your-db-host
PGDATABASE=your-database
PGUSER=your-user
PGPASSWORD=your-password
PGPORT=5432
```

For detailed API usage, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
