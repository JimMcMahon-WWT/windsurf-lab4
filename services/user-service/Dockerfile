FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package-lock.json ./
COPY services/user-service/package.json ./
COPY tsconfig.json ./tsconfig.base.json
COPY services/user-service/tsconfig.json ./tsconfig.json

# Fix tsconfig extends path
RUN sed -i 's|../../tsconfig.json|./tsconfig.base.json|g' tsconfig.json

# Install dependencies
RUN npm install

# Copy source code
COPY services/user-service/src ./src

# Build TypeScript
RUN npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package-lock.json ./
COPY services/user-service/package.json ./

# Install only production dependencies
RUN npm install --only=production

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Create non-root user and logs directory
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    mkdir -p logs && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3001

CMD ["node", "dist/server.js"]
