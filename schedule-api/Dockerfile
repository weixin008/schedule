FROM node:20-alpine

# Install build dependencies for native modules
RUN apk add --no-cache \
    wget \
    python3 \
    make \
    g++ \
    sqlite

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies first (including dev dependencies for build)
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Clean up dev dependencies after build
RUN npm prune --production

# Create necessary directories
RUN mkdir -p logs data

# Expose port
EXPOSE 9020

# Start the application
CMD ["npm", "run", "start:prod"]