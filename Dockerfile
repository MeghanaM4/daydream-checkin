# Multi-stage Dockerfile for SvelteKit (adapter-node) + Coolify
# - Uses Bun (bun.lock) for reproducible installs
# - Bakes $env/static/public and $env/static/private at build time via ARG/ENV
# - Reads $env/dynamic/* at runtime from container env
#
# In Coolify:
# - Set PUBLIC_* and other $env/static/* vars as Build Args so they are available during `bun run build`.
# - Also set all variables as Runtime Environment variables for the container.

# ---------- Builder ----------
FROM node:20-alpine AS builder
WORKDIR /app

# Optional, improves compatibility with some native deps
RUN apk add --no-cache libc6-compat curl

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash \
    && ln -s /root/.bun/bin/bun /usr/local/bin/bun

# Copy manifests first for better layer caching
COPY package.json bun.lock ./

# Copy the rest of the sources
COPY . .

# Build-time environment (bakes values for $env/static/*)
# Provide these as --build-arg in Coolify
ARG AIRTABLE_API_KEY
ARG AIRTABLE_BASE_ID
ARG GITHUB_CLIENT_ID
ARG GITHUB_CLIENT_SECRET
ARG ITCH_CLIENT_ID
ARG LOOPS_API_KEY
ARG LOOPS_VERIFICATION_TRANSACTIONAL_ID
ARG LOOPS_TICKET_TRANSACTIONAL_ID
ARG PUBLIC_BASE_URL
ARG PUBLIC_DOCUSEAL_EMBED_URL
ARG SESSION_SECRET
# Dynamic-only (used by $env/dynamic/private in waiver-verify)
ARG DOCUSEAL_API_KEY
ARG DOCUSEAL_API_BASE

# Expose args to the build step
ENV AIRTABLE_API_KEY=${AIRTABLE_API_KEY}
ENV AIRTABLE_BASE_ID=${AIRTABLE_BASE_ID}
ENV GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID}
ENV GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET}
ENV ITCH_CLIENT_ID=${ITCH_CLIENT_ID}
ENV LOOPS_API_KEY=${LOOPS_API_KEY}
ENV LOOPS_VERIFICATION_TRANSACTIONAL_ID=${LOOPS_VERIFICATION_TRANSACTIONAL_ID}
ENV LOOPS_TICKET_TRANSACTIONAL_ID=${LOOPS_TICKET_TRANSACTIONAL_ID}
ENV PUBLIC_BASE_URL=${PUBLIC_BASE_URL}
ENV PUBLIC_DOCUSEAL_EMBED_URL=${PUBLIC_DOCUSEAL_EMBED_URL}
ENV SESSION_SECRET=${SESSION_SECRET}
ENV DOCUSEAL_API_KEY=${DOCUSEAL_API_KEY}
ENV DOCUSEAL_API_BASE=${DOCUSEAL_API_BASE}

# Install deps and build
RUN bun install --frozen-lockfile
RUN bun run build

# ---------- Runner ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# SvelteKit adapter-node respects HOST/PORT
ENV HOST=0.0.0.0
ENV PORT=3000

# Copy built app
COPY --from=builder /app/build ./build

# Install runtime deps for the built server (as per adapter-node guidance)
COPY --from=builder /app/build/package.json ./build/package.json
RUN npm install --omit=dev --prefix ./build

# At runtime, Coolify injects env vars for $env/dynamic/* and your server code
# (No secrets baked here; they come from the environment.)

EXPOSE 3000
CMD ["node", "build"]
