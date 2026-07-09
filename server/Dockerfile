FROM node:18-alpine

WORKDIR /app

# Copy root configurations and workspace packages
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY server/package*.json ./server/

# Install workspaces dependencies
RUN npm ci

# Copy source code and Prisma schemas
COPY shared/ ./shared/
COPY database/ ./database/
COPY server/ ./server/

# Build shared library first
RUN npm run build:shared

# Generate Prisma client and compile Express server
WORKDIR /app/server
RUN npm run prisma:generate
RUN npm run build

EXPOSE 5000

CMD ["npm", "run", "start"]
