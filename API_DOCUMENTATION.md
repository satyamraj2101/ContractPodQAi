# API Documentation

Complete reference for all API endpoints in the ContractPodAI Documentation Assistant.

## Base URL

```
http://localhost:5000
```

## Authentication

The API uses session-based authentication with cookies. Most endpoints require authentication.

### Authentication Flow

1. Login via `/api/auth/login`
2. Session cookie automatically set (httpOnly, secure)
3. Include cookie in subsequent requests
4. Logout via `/api/auth/logout`

---

## Table of Contents

1. [Authentication Endpoints](#authentication-endpoints)
2. [User Profile Endpoints](#user-profile-endpoints)
3. [Chat & Conversation Endpoints](#chat--conversation-endpoints)
4. [Document Management Endpoints](#document-management-endpoints)
5. [Feedback Endpoints](#feedback-endpoints)
6. [Admin - User Management](#admin---user-management)
7. [Admin - Password Reset Management](#admin---password-reset-management)
8. [Admin - Activity & Analytics](#admin---activity--analytics)
9. [Error Responses](#error-responses)

---

## Authentication Endpoints

### Login
Authenticate user with email and password.

**Endpoint:** `POST /api/auth/login`

**Authentication:** None required

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "userpassword"
}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "employeeId": "EMP123",
    "mobile": "+1234567890",
    "isAdmin": false,
    "isActive": true
  }
}
```

**Errors:**
- `401 Unauthorized` - Invalid credentials
- `403 Forbidden` - Account inactive

---

### Logout
End user session.

**Endpoint:** `POST /api/auth/logout`

**Authentication:** Required

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

---

### Get Current User
Retrieve authenticated user information.

**Endpoint:** `GET /api/auth/user`

**Authentication:** Required

**Response (200 OK):**
```json
{
  "id": "uuid-here",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "employeeId": "EMP123",
  "mobile": "+1234567890",
  "isAdmin": false,
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Errors:**
- `401 Unauthorized` - Not logged in

---

### Forgot Password
Initiate forgot password flow (legacy endpoint, use password reset request instead).

**Endpoint:** `POST /api/auth/forgot-password`

**Authentication:** None required

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
  "message": "Password reset email would be sent to: user@example.com"
}
```

---

## User Profile Endpoints

### Update Profile
Update user profile information.

**Endpoint:** `PATCH /api/profile`

**Authentication:** Required

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "employeeId": "EMP456",
  "mobile": "+9876543210"
}
```

**Response (200 OK):**
```json
{
  "id": "uuid-here",
  "email": "user@example.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "employeeId": "EMP456",
  "mobile": "+9876543210",
  "isAdmin": false,
  "isActive": true
}
```

**Errors:**
- `401 Unauthorized` - Not logged in
- `400 Bad Request` - Invalid input

---

### Change Password
Change authenticated user's password.

**Endpoint:** `POST /api/profile/change-password`

**Authentication:** Required

**Request Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

**Response (200 OK):**
```json
{
  "message": "Password changed successfully"
}
```

**Errors:**
- `401 Unauthorized` - Not logged in or incorrect current password
- `400 Bad Request` - Invalid password format

---

### Request Password Reset
Submit password reset request for admin approval.

**Endpoint:** `POST /api/password-reset/request`

**Authentication:** Required

**Request Body:**
```json
{
  "newPassword": "mynewpassword123"
}
```

**Response (201 Created):**
```json
{
  "message": "Password reset request submitted. An admin will review it shortly.",
  "requestId": "uuid-here"
}
```

**Errors:**
- `401 Unauthorized` - Not logged in
- `400 Bad Request` - Pending request already exists

---

## Chat & Conversation Endpoints

### Get Chat History
Retrieve all conversations for authenticated user.

**Endpoint:** `GET /api/chat/history`

**Authentication:** Required

**Response (200 OK):**
```json
[
  {
    "id": "conv-uuid-1",
    "userId": "user-uuid",
    "title": "How to create a contract?",
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T10:30:00.000Z",
    "isActive": true
  }
]
```

**Note:** Automatically cleans up messages older than 7 days.

---

### Send Chat Message
Send a message and get AI response.

**Endpoint:** `POST /api/chat/message`

**Authentication:** Required

**Request Body:**
```json
{
  "question": "How do I create a new contract?",
  "conversationId": "conv-uuid-1"  // Optional, creates new if omitted
}
```

**Response (200 OK):**
```json
{
  "userMessage": {
    "id": "msg-uuid-1",
    "conversationId": "conv-uuid-1",
    "userId": "user-uuid",
    "role": "user",
    "content": "How do I create a new contract?",
    "timestamp": "2024-01-01T10:00:00.000Z"
  },
  "assistantMessage": {
    "id": "msg-uuid-2",
    "conversationId": "conv-uuid-1",
    "userId": "user-uuid",
    "role": "assistant",
    "content": "To create a new contract in ContractPodAI...",
    "sources": [
      {
        "id": "source-doc123",
        "filename": "User Guide.pdf",
        "page": 5,
        "url": "/api/documents/doc123"
      }
    ],
    "timestamp": "2024-01-01T10:00:05.000Z"
  },
  "conversationId": "conv-uuid-1"
}
```

**Errors:**
- `401 Unauthorized` - Not logged in
- `400 Bad Request` - Missing question or conversation limit reached (max 5)
- `404 Not Found` - Conversation not found
- `429 Too Many Requests` - Gemini API quota exceeded

---

### List Conversations
Get all conversations for authenticated user.

**Endpoint:** `GET /api/conversations`

**Authentication:** Required

**Response (200 OK):**
```json
[
  {
    "id": "conv-uuid-1",
    "userId": "user-uuid",
    "title": "How to create a contract?",
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T10:30:00.000Z",
    "isActive": true,
    "messageCount": 10
  }
]
```

---

### Get Conversation Messages
Retrieve all messages in a specific conversation.

**Endpoint:** `GET /api/conversations/:id/messages`

**Authentication:** Required

**URL Parameters:**
- `id` - Conversation UUID

**Response (200 OK):**
```json
[
  {
    "id": "msg-uuid-1",
    "conversationId": "conv-uuid-1",
    "role": "user",
    "content": "How do I create a contract?",
    "timestamp": "2024-01-01T10:00:00.000Z"
  },
  {
    "id": "msg-uuid-2",
    "conversationId": "conv-uuid-1",
    "role": "assistant",
    "content": "To create a contract...",
    "sources": [...],
    "timestamp": "2024-01-01T10:00:05.000Z"
  }
]
```

**Errors:**
- `404 Not Found` - Conversation not found or doesn't belong to user

---

### Delete Conversation
Delete a conversation and all its messages.

**Endpoint:** `DELETE /api/conversations/:id`

**Authentication:** Required

**URL Parameters:**
- `id` - Conversation UUID

**Response (200 OK):**
```json
{
  "message": "Conversation deleted successfully"
}
```

**Errors:**
- `404 Not Found` - Conversation not found or doesn't belong to user

---

## Document Management Endpoints

### List Documents
Get all uploaded documents.

**Endpoint:** `GET /api/documents`

**Authentication:** Required

**Response (200 OK):**
```json
[
  {
    "id": "doc-uuid-1",
    "filename": "internal-file-name.pdf",
    "originalFilename": "User Guide.pdf",
    "fileType": "PDF",
    "fileSize": "2.5 MB",
    "uploadedBy": "admin-uuid",
    "uploadDate": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### Upload Documents
Upload one or more documentation files (Admin only).

**Endpoint:** `POST /api/documents/upload`

**Authentication:** Required (Admin)

**Content-Type:** `multipart/form-data`

**Request Body:**
- `files[]` - Array of files (max 10 files, 10MB each)

**Supported File Types:**
- PDF, DOCX, PPTX
- TXT, MD, HTML, HTM
- XLSX, XLS

**Response (200 OK):**
```json
{
  "message": "3 documents uploaded successfully",
  "documents": [
    {
      "id": "doc-uuid-1",
      "filename": "stored-file-1.pdf",
      "originalFilename": "User Guide.pdf",
      "chunks": 15,
      "images": 3
    }
  ]
}
```

**Processing Steps:**
1. File validation (type, size)
2. Text extraction based on file type
3. Text normalization (remove artifacts)
4. Intelligent chunking (~1000 chars)
5. Embedding generation (Gemini text-embedding-004)
6. Image extraction and AI description (for supported formats)

**Errors:**
- `401 Unauthorized` - Not logged in or not admin
- `400 Bad Request` - No files or invalid file type
- `413 Payload Too Large` - File exceeds 10MB

---

### Get Document
Download or view a specific document.

**Endpoint:** `GET /api/documents/:id`

**Authentication:** Required

**URL Parameters:**
- `id` - Document UUID

**Response (200 OK):**
Returns the actual file with appropriate content-type header.

**Errors:**
- `404 Not Found` - Document not found
- `500 Internal Server Error` - File not accessible

---

### Delete Document
Delete a document and all its chunks/embeddings (Admin only).

**Endpoint:** `DELETE /api/documents/:id`

**Authentication:** Required (Admin)

**URL Parameters:**
- `id` - Document UUID

**Response (200 OK):**
```json
{
  "message": "Document deleted successfully"
}
```

**Note:** Also deletes the physical file and all document_chunks/document_images.

**Errors:**
- `401 Unauthorized` - Not admin
- `404 Not Found` - Document not found

---

### Regenerate Embeddings
Regenerate embeddings for a document (Admin only).

**Endpoint:** `POST /api/documents/:id/regenerate-embeddings`

**Authentication:** Required (Admin)

**URL Parameters:**
- `id` - Document UUID

**Response (200 OK):**
```json
{
  "message": "Embeddings regenerated successfully",
  "chunks": 20
}
```

**Use Case:** When embedding model changes or documents need reprocessing.

**Errors:**
- `401 Unauthorized` - Not admin
- `404 Not Found` - Document not found

---

## Feedback Endpoints

### Submit Feedback
Submit feedback on an AI response.

**Endpoint:** `POST /api/feedback`

**Authentication:** Required

**Request Body:**
```json
{
  "conversationId": "conv-uuid-1",      // Optional
  "messageId": "msg-uuid-2",            // Optional
  "feedbackType": "positive",           // 'positive', 'negative', 'suggestion'
  "feedbackText": "Very helpful!",      // Optional
  "rating": 5                           // Optional 1-5
}
```

**Response (201 Created):**
```json
{
  "message": "Feedback submitted successfully",
  "feedback": {
    "id": "feedback-uuid-1",
    "userId": "user-uuid",
    "feedbackType": "positive",
    "rating": 5,
    "submittedAt": "2024-01-01T10:00:00.000Z"
  }
}
```

**Errors:**
- `401 Unauthorized` - Not logged in
- `400 Bad Request` - Invalid feedback type

---

### Get All Feedback (Admin)
Retrieve all user feedback.

**Endpoint:** `GET /api/admin/feedback`

**Authentication:** Required (Admin)

**Response (200 OK):**
```json
[
  {
    "id": "feedback-uuid-1",
    "userId": "user-uuid",
    "user": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    },
    "conversationId": "conv-uuid-1",
    "messageId": "msg-uuid-2",
    "feedbackType": "positive",
    "feedbackText": "Very helpful!",
    "rating": 5,
    "submittedAt": "2024-01-01T10:00:00.000Z"
  }
]
```

---

## Admin - User Management

### List All Users
Get all users in the system.

**Endpoint:** `GET /api/admin/users`

**Authentication:** Required (Admin)

**Response (200 OK):**
```json
[
  {
    "id": "user-uuid-1",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "employeeId": "EMP123",
    "mobile": "+1234567890",
    "isAdmin": false,
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### Create User
Create a new user account (Admin only).

**Endpoint:** `POST /api/admin/users`

**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "initialpassword",
  "firstName": "Jane",
  "lastName": "Smith",
  "employeeId": "EMP456",
  "mobile": "+9876543210",
  "isAdmin": false
}
```

**Response (201 Created):**
```json
{
  "message": "User created successfully",
  "user": {
    "id": "new-user-uuid",
    "email": "newuser@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "isAdmin": false,
    "isActive": true
  }
}
```

**Errors:**
- `400 Bad Request` - Email already exists or validation error
- `401 Unauthorized` - Not admin

---

### Update User
Update user information (Admin only).

**Endpoint:** `PATCH /api/admin/users/:id`

**Authentication:** Required (Admin)

**URL Parameters:**
- `id` - User UUID

**Request Body:**
```json
{
  "firstName": "Updated",
  "lastName": "Name",
  "employeeId": "EMP999",
  "mobile": "+1111111111",
  "isActive": true
}
```

**Response (200 OK):**
```json
{
  "message": "User updated successfully",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "firstName": "Updated",
    "lastName": "Name",
    "isActive": true
  }
}
```

**Errors:**
- `404 Not Found` - User not found
- `401 Unauthorized` - Not admin

---

### Change User Password (Admin)
Change another user's password.

**Endpoint:** `POST /api/admin/users/:id/change-password`

**Authentication:** Required (Admin)

**URL Parameters:**
- `id` - User UUID

**Request Body:**
```json
{
  "newPassword": "newpassword123"
}
```

**Response (200 OK):**
```json
{
  "message": "Password changed successfully for user@example.com"
}
```

---

### Get User Activity
Get activity stats for a specific user.

**Endpoint:** `GET /api/admin/users/:id/activity`

**Authentication:** Required (Admin)

**URL Parameters:**
- `id` - User UUID

**Response (200 OK):**
```json
{
  "userId": "user-uuid",
  "loginCount": 25,
  "messageCount": 150,
  "conversationCount": 5,
  "lastLogin": "2024-01-15T10:30:00.000Z"
}
```

---

## Admin - Password Reset Management

### Get Password Reset Requests
List all pending password reset requests.

**Endpoint:** `GET /api/admin/password-resets`

**Authentication:** Required (Admin)

**Response (200 OK):**
```json
[
  {
    "id": "reset-uuid-1",
    "userId": "user-uuid",
    "user": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    },
    "status": "pending",
    "requestedAt": "2024-01-15T09:00:00.000Z"
  }
]
```

**Note:** Only returns requests with status='pending'.

---

### Approve Password Reset
Approve a password reset request.

**Endpoint:** `POST /api/admin/password-resets/:id/approve`

**Authentication:** Required (Admin)

**URL Parameters:**
- `id` - Reset request UUID

**Request Body:**
```json
{
  "reviewNote": "Approved after identity verification"  // Optional
}
```

**Response (200 OK):**
```json
{
  "message": "Password reset approved and applied",
  "request": {
    "id": "reset-uuid-1",
    "status": "approved",
    "reviewedBy": "admin-uuid",
    "reviewedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

**Process:**
1. Updates user's password with the pre-hashed password
2. Marks request as 'approved'
3. Records admin who approved and timestamp
4. Saves optional review note

---

### Reject Password Reset
Reject a password reset request.

**Endpoint:** `POST /api/admin/password-resets/:id/reject`

**Authentication:** Required (Admin)

**URL Parameters:**
- `id` - Reset request UUID

**Request Body:**
```json
{
  "reviewNote": "Unable to verify identity"  // Optional
}
```

**Response (200 OK):**
```json
{
  "message": "Password reset request rejected",
  "request": {
    "id": "reset-uuid-1",
    "status": "rejected",
    "reviewedBy": "admin-uuid",
    "reviewedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

---

## Admin - Activity & Analytics

### Get All Users Activity
Retrieve activity summary for all users (30-day window).

**Endpoint:** `GET /api/admin/activity`

**Authentication:** Required (Admin)

**Response (200 OK):**
```json
[
  {
    "userId": "user-uuid-1",
    "user": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    },
    "loginCount": 25,
    "messageCount": 150,
    "conversationCount": 5,
    "lastLogin": "2024-01-15T10:30:00.000Z"
  }
]
```

**Metrics:**
- **loginCount**: Total logins in past 30 days
- **messageCount**: Total messages sent
- **conversationCount**: Active conversations
- **lastLogin**: Most recent login timestamp

---

## Error Responses

### Standard Error Format

```json
{
  "message": "Error description",
  "error": "error_code"  // Optional
}
```

### Common HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid input or validation error |
| 401 | Unauthorized | Not authenticated or invalid credentials |
| 403 | Forbidden | Authenticated but not authorized (e.g., not admin) |
| 404 | Not Found | Resource not found |
| 413 | Payload Too Large | File size exceeds limit |
| 429 | Too Many Requests | Rate limit exceeded (Gemini API) |
| 500 | Internal Server Error | Server error |

### Error Codes

| Code | Description |
|------|-------------|
| `conversation_limit_reached` | User has 5 active conversations (max) |
| `quota_exceeded` | Gemini API quota exceeded |
| `invalid_file_type` | Unsupported file format |
| `pending_request_exists` | User already has pending password reset |

---

## Rate Limits

### Gemini API Limits (Free Tier)
- **Requests per minute**: 15
- **Requests per day**: 1,500
- **Tokens per minute**: 1,000,000

**Note:** Exceeding limits returns 429 error. Consider upgrading to paid tier for production.

---

## Security Headers

All authenticated endpoints require:

```
Cookie: connect.sid=<session-id>
```

Session cookie is automatically managed by the browser after login.

---

## Testing with cURL

### Login Example
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}' \
  -c cookies.txt
```

### Authenticated Request Example
```bash
curl -X GET http://localhost:5000/api/conversations \
  -b cookies.txt
```

### Upload Document Example
```bash
curl -X POST http://localhost:5000/api/documents/upload \
  -b cookies.txt \
  -F "files=@/path/to/document.pdf"
```

---

## Webhooks & Real-time Updates

Currently not implemented. All updates are poll-based.

**Future Considerations:**
- WebSocket support for real-time chat
- Server-Sent Events (SSE) for notifications
- Webhook integration for external systems

---

## Versioning

Current API Version: **v1** (implicit, no version in URL)

Future versions will use URL versioning:
- `/api/v2/...`

---

## Support & Contact

For API issues or questions:
1. Check this documentation
2. Review [README.md](./README.md) for setup
3. See [SCHEMA.md](./SCHEMA.md) for database details
4. Contact system administrator

---

## Changelog

### Version 1.0.0 (Current)
- Initial API release
- Email/password authentication
- Conversation-based chat system
- Document upload and processing
- Admin panel and user management
- Password reset workflow
- Activity tracking and feedback
