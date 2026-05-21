FROM node

# Install only the bare minimum Chromium headless dependencies
# and clean apt cache in the same layer to keep image small
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    libglib2.0-0 \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Use system Chromium, skip Puppeteer's bundled download
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy source
COPY index.js .

# Session persistence directory
RUN mkdir -p /app/data/session

# Non-root user — Chromium won't run as root
RUN groupadd -r bot && useradd -r -g bot bot \
    && chown -R bot:bot /app

USER bot

EXPOSE 3000

CMD ["node", "index.js"]