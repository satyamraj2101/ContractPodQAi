# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY client ./client
COPY server ./server
COPY shared ./shared
COPY vite.config.ts tsconfig.json tailwind.config.ts postcss.config.js ./

# Build the project (client + server)
RUN npm run build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app

# Use production environment
ENV NODE_ENV=production

# Copy package.json and install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy build output from builder
COPY --from=builder /app/dist ./dist

# Create directories and set ownership to 'node'
RUN mkdir -p /app/uploads /app/feedback \
    && chown -R node:node /app/uploads /app/feedback

# Switch to non-root user
USER node

# Expose the application port
EXPOSE 5000

# Start the server
CMD ["npm", "start"]
