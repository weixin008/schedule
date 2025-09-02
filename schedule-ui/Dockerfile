# Build stage
FROM node:20-alpine as build-stage

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build argument for API URL


# Build the application (使用快速构建跳过类型检查)
RUN npm run build:fast

# Temporary: Replace localhost with public IP
RUN sed -i 's|http://localhost:9020|http://117.72.205.253:9020|g' /app/dist/index.html /app/dist/assets/*.js

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