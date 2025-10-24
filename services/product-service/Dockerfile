# Multi-stage Dockerfile for Product Service
# Stage 1: Builder
FROM node:18-alpine AS builder

# Install build dependencies for native modules (Sharp)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    vips-dev \
    fftw-dev

WORKDIR /app

# Copy package files
COPY package-lock.json ./
COPY services/product-service/package.json ./
COPY services/product-service/tsconfig.json ./

# Install all dependencies (including dev dependencies)
RUN npm install

# Copy source code
COPY services/product-service/src ./src

# Build TypeScript to JavaScript
RUN npm run build

# Stage 2: Production
FROM node:18-alpine

# Install dumb-init and dependencies for Sharp (image processing)
RUN apk add --no-cache \
    dumb-init \
    vips-dev \
    fftw-dev \
    gcc \
    g++ \
    make \
    libc-dev

WORKDIR /app

# Copy package files
COPY package-lock.json ./
COPY services/product-service/package.json ./

# Install only production dependencies 
RUN npm install --only=production && \
    npm install --cpu=x64 --os=linux --libc=musl sharp && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    mkdir -p logs && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3002/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/server.js"]
