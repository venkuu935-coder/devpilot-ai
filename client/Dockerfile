FROM node:18-alpine

WORKDIR /app

# Copy root configurations and workspace packages
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY client/package*.json ./client/

# Install workspaces dependencies
RUN npm ci

# Copy source code
COPY shared/ ./shared/
COPY client/ ./client/

# Build shared library first
RUN npm run build:shared

# Build client React application
WORKDIR /app/client
RUN npm run build

EXPOSE 5173

# Serve static bundles via vite preview
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "5173"]
