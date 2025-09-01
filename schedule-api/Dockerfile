FROM node:20-alpine

# Install wget for health checks
RUN apk add --no-cache wget

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with legacy peer deps to avoid conflicts
RUN npm install --legacy-peer-deps --omit=dev

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create necessary directories
RUN mkdir -p logs data

# Expose port
EXPOSE 9020

# Start the application
CMD ["npm", "run", "start:prod"]