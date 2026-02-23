# BJS Labs — Sam Cloud
# Based on working vignesh07/clawdbot-railway-template

FROM node:22-bookworm AS openclaw-build
RUN apt-get update && apt-get install -y git curl ca-certificates python3 make g++ && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"
RUN corepack enable
WORKDIR /openclaw
ARG OPENCLAW_GIT_REF=v2026.2.17
RUN git clone --depth 1 --branch "${OPENCLAW_GIT_REF}" https://github.com/openclaw/openclaw.git .
RUN pnpm install --no-frozen-lockfile && pnpm build && pnpm ui:install && pnpm ui:build

FROM node:22-bookworm
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y ca-certificates tini python3 python3-venv && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.23.0 --activate

ENV NPM_CONFIG_PREFIX=/data/npm \
    PNPM_HOME=/data/pnpm \
    PATH="/data/npm/bin:/data/pnpm:${PATH}"

WORKDIR /app

# Copy wrapper (package.json + src/)
COPY package.json ./
RUN npm install --omit=dev

# Copy built openclaw
COPY --from=openclaw-build /openclaw /openclaw
RUN printf '%s\n' '#!/usr/bin/env bash' 'exec node /openclaw/dist/entry.js "$@"' > /usr/local/bin/openclaw && chmod +x /usr/local/bin/openclaw

# Copy server wrapper
COPY src ./src

# Seed workspace (optional - for fresh deployments)
COPY workspace/ /app/workspace-seed/

EXPOSE 8080
ENTRYPOINT ["tini", "--"]
CMD ["node", "src/server.js"]
