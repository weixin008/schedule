FROM node:20-alpine

# 使用阿里云镜像源加速
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# Install build dependencies for native modules
RUN apk add --no-cache \
    python3 \
    py3-setuptools \
    make \
    g++ \
    sqlite

WORKDIR /app

# Copy package files
COPY package*.json ./

# 使用淘宝 npm 镜像加速
RUN npm config set registry https://registry.npmmirror.com

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