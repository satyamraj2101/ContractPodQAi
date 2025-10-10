# ContractPodAI Documentation Assistant

An enterprise-grade internal AI-powered chatbot application that helps users quickly find accurate information from ContractPodAI's CLM platform documentation. The system features semantic search with source citations, admin-controlled user management, and conversation-based chat history.

## 🚀 Features

### Core Functionality
- **AI-Powered Q&A**: Ask questions in natural language and receive AI-generated responses with source citations
- **Multi-Format Document Support**: Upload and process PDF, DOCX, PPTX, TXT, MD, HTML, XLSX files
- **Semantic Search**: Vector-based search using Google Gemini embeddings for accurate context retrieval
- **Source Citations**: Every AI response includes clickable citations linking to source documents
- **Image Processing**: Automatic extraction and AI description of images from documents

### User Management
- **Email/Password Authentication**: Secure login with bcrypt password hashing
- **Admin-Controlled Provisioning**: Only admins can create new user accounts
- **User Profile Management**: Users can update their profile and change passwords
- **Admin Panel**: Comprehensive admin dashboard for user, document, and system management

### Conversation System
- **Multi-Conversation Support**: Up to 5 active conversations per user
- **Conversation History**: Persistent chat history organized by conversations
- **Auto-Titling**: Conversations automatically titled from first message

### Admin Capabilities
- **User Management**: Create, activate/deactivate, delete users
- **Password Reset Workflow**: Admin-approved password reset with review notes
- **Activity Tracking**: 30-day rolling window of user actions (login, messages, documents)
- **Feedback Monitoring**: View and analyze user feedback on AI responses
- **Document Management**: Upload, view, and delete knowledge base documents

### Security & Compliance
- **Role-Based Access Control (RBAC)**: Admin flags for privileged operations
- **Session Management**: Secure session storage with PostgreSQL
- **Password Security**: bcrypt hashing with salt rounds
- **Activity Logging**: Track login history and user actions

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn** package manager
- **PostgreSQL** (v14 or higher)
- **Google Gemini API Key** (free tier available)

## 🔧 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd contractpodai-docs-assistant
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@host/database
PGHOST=your-db-host.neon.tech
PGDATABASE=your-database-name
PGUSER=your-db-username
PGPASSWORD=your-db-password
PGPORT=5432

# Session Secret (generate a random string)
SESSION_SECRET=your-random-session-secret-here

# Google Gemini API Configuration
GEMINI_API_KEY=your-gemini-api-key-here

# Optional: OpenAI API (if using OpenAI instead of Gemini)
OPENAI_API_KEY=your-openai-api-key-here
```

**How to Get API Keys:**

- **Google Gemini API Key**: Visit [Google AI Studio](https://makersuite.google.com/app/apikey) to create a free API key
- **Session Secret**: Generate using: `openssl rand -base64 32`

### 4. Initialize the Database

Run the database schema migration:

```bash
npm run db:push
```

This will create all necessary tables in your PostgreSQL database.

### 5. Create Admin User (Manual Setup)

After the database is initialized, you'll need to create your first admin user manually in the database:

```sql
-- Connect to your database and run:
INSERT INTO users (email, password_hash, first_name, last_name, is_admin, is_active, employee_id)
VALUES (
  'admin@yourcompany.com',
  '$2a$10$YourBcryptHashHere',  -- Generate using bcrypt
  'Admin',
  'User',
  true,
  true,
  'EMP001'
);
```

To generate a bcrypt hash for your password, you can use Node.js:

```javascript
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('your-password', 10);
console.log(hash);
```

## 🚀 Running the Application

### Development Mode

```bash
npm run dev
```

The application will start on `http://localhost:5000`

### Production Mode

```bash
# Build the application
npm run build

# Start the production server
npm start
```

## 📁 Project Structure

```
contractpodai-docs-assistant/
├── client/                    # Frontend React application
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/            # Page components (Chat, Admin, Profile)
│   │   ├── lib/              # Utility functions and configs
│   │   └── App.tsx           # Main app component with routing
├── server/                    # Backend Express application
│   ├── auth.ts               # Authentication logic
│   ├── routes.ts             # API route handlers
│   ├── storage.ts            # Database operations
│   ├── index.ts              # Server entry point
│   └── vite.ts               # Vite integration
├── shared/                    # Shared code between frontend/backend
│   └── schema.ts             # Database schema (Drizzle ORM)
├── uploads/                   # Uploaded document storage
├── design_guidelines.md       # UI/UX design specifications
├── replit.md                 # Project documentation
└── package.json              # Dependencies and scripts
```

## 🔑 Default Login

After creating your admin user, log in using:

- **Email**: admin@yourcompany.com (or your configured email)
- **Password**: Your configured password

## 📚 Key Technologies

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Wouter** for routing
- **TanStack Query** for server state management
- **shadcn/ui** component library
- **Tailwind CSS** for styling
- **Dark/Light mode** support

### Backend
- **Express.js** with TypeScript
- **PostgreSQL** (Neon serverless)
- **Drizzle ORM** for database queries
- **Google Gemini AI** for embeddings and chat
- **Session-based authentication**
- **Multer** for file uploads

### AI/ML
- **Google Gemini API**:
  - `gemini-2.5-flash` for chat responses
  - `gemini-2.0-flash-exp` for image descriptions
  - `text-embedding-004` for vector embeddings
- **Vector similarity search** with 0.6 threshold

## 🎯 Usage Guide

### For Users

1. **Login**: Access the application and log in with your credentials
2. **Start Chatting**: Ask questions about ContractPodAI documentation
3. **View Sources**: Click on source citations to see referenced documents
4. **Manage Conversations**: Create up to 5 conversations, delete old ones
5. **Provide Feedback**: Rate AI responses as helpful or not helpful
6. **Update Profile**: Edit your name, employee ID, and mobile number

### For Administrators

1. **Access Admin Panel**: Click on "Admin Panel" in the sidebar
2. **User Management**: 
   - Create new users with full profile details
   - Activate/deactivate user accounts
   - Delete users when necessary
3. **Password Reset Approvals**:
   - Review pending reset requests
   - Approve or reject with optional notes
4. **Document Management**:
   - Upload documentation files (PDF, DOCX, PPTX, etc.)
   - View all uploaded documents
   - Delete outdated documents
5. **Activity Monitoring**:
   - Track user login counts and last login
   - Monitor message activity
   - View active conversations per user
6. **Feedback Review**:
   - See all user feedback on AI responses
   - Identify areas for improvement

## 🔒 Security Features

- **Password Hashing**: bcrypt with 10 salt rounds
- **Session Security**: HttpOnly cookies, secure session storage
- **RBAC**: Admin-only endpoints protected with middleware
- **Input Validation**: Zod schema validation for all API requests
- **File Upload Security**: Type and size restrictions (10MB max)
- **Activity Logging**: 30-day audit trail

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1"

# Re-push schema if tables are missing
npm run db:push --force
```

### Gemini API Quota Exceeded

- The free tier has rate limits
- Upgrade to paid tier or wait for quota reset
- Check API usage in Google Cloud Console

### File Upload Errors

- Ensure `uploads/` directory exists and has write permissions
- Check file size limits (10MB max)
- Verify supported file types: PDF, DOCX, PPTX, TXT, MD, HTML, XLSX

### Session Errors

- Clear browser cookies
- Restart the server
- Check `SESSION_SECRET` in environment variables

## 📊 Database Maintenance

### Clean Up Old Data

```sql
-- Delete messages older than 7 days (automatic in app)
DELETE FROM chat_messages WHERE timestamp < NOW() - INTERVAL '7 days';

-- Delete inactive password reset requests
DELETE FROM password_reset_requests WHERE status != 'pending';
```

### Backup Database

```bash
# Using pg_dump
pg_dump $DATABASE_URL > backup.sql

# Restore from backup
psql $DATABASE_URL < backup.sql
```

## 🔄 Updating the Application

```bash
# Pull latest changes
git pull origin main

# Install new dependencies
npm install

# Update database schema
npm run db:push

# Restart server
npm run dev
```

## 📝 Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `PGHOST` | Yes | Database host |
| `PGDATABASE` | Yes | Database name |
| `PGUSER` | Yes | Database user |
| `PGPASSWORD` | Yes | Database password |
| `PGPORT` | No | Database port (default: 5432) |
| `SESSION_SECRET` | Yes | Secret for session encryption |
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `OPENAI_API_KEY` | No | OpenAI API key (optional) |

## 🤝 Support

For issues or questions:
1. Check the [API Documentation](./API_DOCUMENTATION.md)
2. Review the [Database Schema](./SCHEMA.md)
3. Contact your system administrator

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- Built with [Replit](https://replit.com)
- Powered by [Google Gemini AI](https://ai.google.dev/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Database by [Neon](https://neon.tech/)
