# Design Guidelines: ContractPodAI Documentation Chatbot

## Design Approach

**Selected Approach**: Design System with inspiration from Linear, Notion, and Slack
**Justification**: As an internal utility-focused tool prioritizing efficiency and information access, this application benefits from established patterns for chat interfaces, document management, and data-heavy displays. The design system approach ensures consistency, learnability, and professional polish.

**Key References**:
- **Linear**: Clean typography, subtle borders, efficient layouts
- **Notion**: Document organization, search patterns, content hierarchy  
- **Slack**: Chat interface patterns, message threading, file attachments

**Design Principles**:
1. **Clarity Over Decoration**: Every element serves a functional purpose
2. **Information Density**: Efficient use of space without overwhelming users
3. **Instant Feedback**: Clear UI responses to all user actions
4. **Trustworthy & Professional**: Enterprise-grade polish and reliability

---

## Core Design Elements

### A. Color Palette

**Dark Mode (Primary)**:
- **Background**: 
  - Primary: 220 15% 10% (deep slate, main canvas)
  - Secondary: 220 15% 14% (elevated surfaces, cards)
  - Tertiary: 220 15% 18% (hover states, active areas)
- **Primary Brand**: 210 100% 55% (vibrant blue, CTAs, links, active states)
- **Text**:
  - Primary: 0 0% 98% (high contrast, headings)
  - Secondary: 0 0% 70% (body text, descriptions)
  - Tertiary: 0 0% 50% (metadata, timestamps)
- **Borders**: 220 15% 22% (subtle separation)
- **Success**: 142 70% 45% (document upload success, positive feedback)
- **Warning**: 38 92% 50% (alerts, important notices)
- **Danger**: 0 72% 55% (errors, destructive actions)

**Light Mode (Secondary)**:
- **Background**:
  - Primary: 0 0% 100% (white canvas)
  - Secondary: 220 15% 97% (cards, elevated surfaces)
  - Tertiary: 220 15% 94% (hover, active)
- **Primary Brand**: 210 100% 50% (slightly darker blue for contrast)
- **Text**:
  - Primary: 220 15% 15% (headings)
  - Secondary: 220 10% 35% (body)
  - Tertiary: 220 10% 55% (metadata)
- **Borders**: 220 15% 88%

### B. Typography

**Font Families**:
- **Primary (UI)**: Inter (Google Fonts) - Clean, highly legible for interfaces
- **Monospace (Code/IDs)**: JetBrains Mono - Document IDs, file paths, technical details

**Type Scale**:
- **Display (32px/2rem)**: Page titles, weight 600
- **Heading 1 (24px/1.5rem)**: Section headers, weight 600
- **Heading 2 (20px/1.25rem)**: Subsections, weight 600
- **Heading 3 (18px/1.125rem)**: Card titles, weight 500
- **Body (16px/1rem)**: Chat messages, document text, weight 400
- **Small (14px/0.875rem)**: Metadata, timestamps, labels, weight 400
- **Micro (12px/0.75rem)**: Badges, tags, helper text, weight 500

**Line Heights**:
- Headings: 1.2
- Body: 1.6
- UI Elements: 1.4

### C. Layout System

**Spacing Primitives**: Use Tailwind units of **2, 4, 6, 8, 12, 16, 24**
- Micro spacing (gaps, padding): p-2, p-4
- Component spacing: p-6, p-8, gap-4
- Section spacing: p-12, p-16, p-24
- Page margins: px-8, px-12

**Grid Structure**:
- **Main Layout**: Two-column split
  - Left sidebar (280px fixed): Document library, filters, recent chats
  - Main area (flex-1): Chat interface, full width utilization
- **Container**: max-w-7xl for content areas
- **Chat Column**: max-w-4xl for optimal reading width

**Breakpoints**:
- Mobile: Stack to single column, collapsible sidebar
- Tablet (768px+): Maintain two-column with narrower sidebar
- Desktop (1024px+): Full layout as designed

### D. Component Library

**Navigation**:
- **Top Bar** (h-16): 
  - ContractPodAI logo/brand (left)
  - Search bar (center, w-96)
  - User avatar + logout (right)
  - Background: Secondary surface, border-b
  
**Sidebar**:
- **Document Library Section**:
  - Heading with upload button (h-12)
  - Scrollable document list with icons
  - Each item: filename, upload date, file size
  - Hover state: Tertiary background
  - Active/selected: Primary brand left border (4px) + subtle background
  
- **Recent Chats** (if space permits):
  - Last 5-10 conversations with preview
  - Click to restore chat context

**Chat Interface**:
- **Messages Container**:
  - User messages: Right-aligned, primary brand background (15% opacity), rounded-2xl, p-4, max-w-2xl
  - AI responses: Left-aligned, secondary surface, rounded-2xl, p-4, max-w-3xl
  - Timestamps: Small text, tertiary color, mb-2
  - Source citations: Compact pills with file icon, filename, clickable
  
- **Input Area** (bottom, sticky):
  - Multi-line textarea, min-h-12, max-h-32
  - Border: Borders color
  - Focus: Primary brand border
  - Send button: Primary brand, rounded-lg, px-6, disabled state when empty
  - Attachment option for follow-up documents

**Document Cards** (in upload/library view):
- Card: Secondary background, border, rounded-lg, p-6
- File icon + name (heading 3)
- Metadata row: Upload date, file size, type badge
- Actions: View, Download icons (hover reveals)

**Buttons**:
- **Primary**: Primary brand background, white text, rounded-lg, px-6 py-3, font-medium
- **Secondary**: Border with primary brand, transparent background, primary brand text, rounded-lg, px-6 py-3
- **Ghost**: No border, tertiary text, hover shows tertiary background
- All buttons: Smooth transitions (150ms), clear hover/active states

**Forms**:
- **Inputs**: Secondary background, border, rounded-lg, px-4 py-3, focus shows primary brand border
- **Labels**: Small text, secondary color, mb-2, font-medium
- **File Upload**: Dashed border, drag-drop zone, centered content, hover shows primary brand border

**Source Citations**:
- **Citation Pill**: 
  - Inline with message, mt-4
  - Secondary surface, border, rounded-full, px-4 py-2
  - File icon + truncated filename + external link icon
  - Hover: Tertiary background, cursor pointer
  - Multiple sources: Flex wrap with gap-2

**Loading States**:
- **Skeleton loaders** for chat responses: Animated pulse, secondary surface
- **Spinner** for file uploads: Primary brand color, centered

**Empty States**:
- Large icon (96px, tertiary color)
- Heading: "No documents yet" or "Start a conversation"
- Description text + CTA button
- Centered vertically and horizontally

### E. Interactions & Animations

**Motion Principles**: Minimal, purposeful motion only
- **Transitions**: 150ms ease-in-out for hovers, 200ms for page transitions
- **Message Send**: Smooth append animation, slight slide-in from bottom (300ms)
- **Document Upload**: Progress bar with percentage (linear animation)
- **NO complex animations** - focus on instant, responsive feedback

---

## Images

**Hero Section**: None required - this is a utility application. Jump straight to the login interface or chat interface.

**Icons**:
- Use **Heroicons** (outline style) via CDN
- File type icons: Document, PDF, Word, Text variations
- UI icons: Upload, Send, Search, Download, External Link, User, Logout
- Consistent 20px or 24px sizing

**Avatars**:
- User avatars: Circular, 40px, initials fallback if no image
- AI assistant icon: Brand-colored robot or document icon, 40px

---

## Page-Specific Layouts

**Login Page**:
- Centered card (max-w-md), secondary surface
- ContractPodAI logo at top
- "Internal Documentation Assistant" subtitle
- Replit Auth login button (primary)
- Clean, minimal, trustworthy presentation

**Main Application**:
- Fixed top bar with branding and search
- Left sidebar (280px) with document library
- Main chat area with full-height messages + sticky input
- Responsive: Sidebar collapses to hamburger menu on mobile

**Document Upload Modal**:
- Overlay with centered modal (max-w-2xl)
- Drag-drop zone with file type indicators
- Upload progress list with cancel option
- Success confirmation with "View in library" action

This design creates a professional, efficient, and trustworthy internal tool that prioritizes functionality while maintaining modern aesthetics and excellent usability.