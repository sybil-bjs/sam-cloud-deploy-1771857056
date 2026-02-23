# BJS Labs — Universal Agent Cloud Deploy
# Not hardcoded to any model or version
# Managed by Sybil (ML/Research)

FROM node:22-slim

# Build args for flexibility
ARG OPENCLAW_VERSION=latest
ARG AGENT_NAME=agent

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install OpenClaw (version controllable via build arg)
RUN npm install -g openclaw@${OPENCLAW_VERSION}

# Create workspace structure
RUN mkdir -p /root/.openclaw/workspace \
    && mkdir -p /root/.openclaw/agents/main/sessions \
    && mkdir -p /root/.openclaw/logs

# Copy agent's brain (workspace files)
COPY workspace/ /root/.openclaw/workspace/

# Copy config (with tokens as env var placeholders)
COPY openclaw.json /root/.openclaw/openclaw.json

# Set working directory
WORKDIR /root/.openclaw/workspace

# Railway provides PORT via environment
ENV OPENCLAW_GATEWAY_PORT=${PORT:-18789}
ENV OPENCLAW_GATEWAY_BIND=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s \
    CMD curl -f http://localhost:${OPENCLAW_GATEWAY_PORT}/ || exit 1

# Start gateway
CMD ["openclaw", "gateway", "run"]
