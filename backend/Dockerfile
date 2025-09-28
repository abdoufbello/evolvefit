# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies for native modules and build tools
RUN apk add --no-cache \
    python3 \
    py3-pip \
    make \
    g++ \
    gcc \
    musl-dev \
    postgresql-client \
    postgresql-dev \
    libc6-compat \
    curl \
    wget

# Set Python path for node-gyp
ENV PYTHON=/usr/bin/python3

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies with verbose logging and proper error handling
RUN npm config set unsafe-perm true && \
    npm config set python /usr/bin/python3 && \
    npm ci --only=production --verbose && \
    npm cache clean --force

# Copy application code
COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start the application
CMD ["npm", "start"]