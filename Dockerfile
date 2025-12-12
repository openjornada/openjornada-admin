# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build with PLACEHOLDER values that will be replaced at runtime
# This allows the same image to be used in different environments
ENV NEXT_PUBLIC_API_URL=__NEXT_PUBLIC_API_URL__
ENV NEXT_PUBLIC_APP_NAME=__NEXT_PUBLIC_APP_NAME__
ENV NEXT_PUBLIC_APP_LOGO=__NEXT_PUBLIC_APP_LOGO__
ENV NEXT_PUBLIC_BASE_PATH=__NEXT_PUBLIC_BASE_PATH__

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public folder
COPY --from=builder /app/public ./public

# Copy standalone build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Change ownership after copying everything
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port 3001
EXPOSE 3001

# Set port for Next.js server
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

# Default values for runtime (can be overridden)
ENV NEXT_PUBLIC_API_URL=""
ENV NEXT_PUBLIC_APP_NAME="OpenTracker"
ENV NEXT_PUBLIC_APP_LOGO="/logo.png"
ENV NEXT_PUBLIC_BASE_PATH=""

# Use entrypoint to replace placeholders at runtime
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "server.js"]
