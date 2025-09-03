# Build stage
FROM node:20-alpine as build-stage

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Build argument for API URL
ARG API_URL=http://localhost:9020/api
ENV VITE_API_BASE_URL=$API_URL

# Copy source code
COPY . .

# Build the application (使用快速构建跳过类型检查)
RUN npm run build:fast

# List build output to verify
RUN ls -la /app/dist

# Production stage
FROM nginx:alpine as production-stage

# Install wget for health checks
RUN apk add --no-cache wget

# Copy built files
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]