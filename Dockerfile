# Multi-stage build for Active Living Lab
# Uses runtime configuration - no build-time secrets needed!
# Stage 1: Build application

FROM node:20-alpine AS builder
WORKDIR /app

# Copy root package files
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production image
FROM node:20-alpine
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --production

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 8080

# Start the server (Cloud Run handles health checks externally)
CMD ["node", "dist/index.js"]
