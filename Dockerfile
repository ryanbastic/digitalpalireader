# Build stage
FROM node:23.3-alpine AS builder
WORKDIR /app

# Enable corepack for pnpm (disable signature check for compatibility)
ENV COREPACK_INTEGRITY_KEYS=0
RUN corepack enable

# Copy package files first for better layer caching
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY . .

# Build the application
RUN pnpm build

# Production stage
FROM caddy:2.9-alpine
WORKDIR /dpr

# Copy built assets from builder
COPY --from=builder /app/dist /dpr

EXPOSE 8080

ENTRYPOINT ["caddy", "file-server", "--listen", ":8080"]
