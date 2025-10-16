# Multi-stage build for ContractPodAI Documentation Assistant
# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files for dependency installation
COPY package.json package-lock.json ./

# Install ALL dependencies (needed for build)
RUN npm ci

# Copy only necessary source directories for build
COPY client ./client
COPY server ./server
COPY shared ./shared
COPY vite.config.ts tsconfig.json tailwind.config.ts postcss.config.js ./
COPY index.html ./

# Build both frontend (Vite) and backend (esbuild)
# Frontend → dist/ (static assets)
# Backend → dist/index.js (compiled server with external packages)
RUN npm run build

# Stage 2: Production image
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Copy package files and install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built artifacts from builder stage
# dist/ contains: frontend static assets + compiled server
COPY --from=builder /app/dist ./dist

# The compiled server has external packages, so we need node_modules
# which we just installed with --only=production above

# Create directories for uploads and feedback with proper permissions
RUN mkdir -p /app/uploads /app/feedback && \
    chown -R node:node /app

# Switch to non-root user for security
USER node

# Expose port 5000
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application using the compiled server
# npm start runs: NODE_ENV=production node dist/index.js
CMD ["npm", "start"]
