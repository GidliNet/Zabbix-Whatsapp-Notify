FROM node:20-slim

# Install Google Chrome and required fonts/dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        wget \
        gnupg \
        ca-certificates \
        fonts-ipafont-gothic \
        fonts-wqy-zenhei \
        fonts-thai-tlwg \
        fonts-kacst \
        fonts-freefont-ttf \
        libxss1 \
    && wget -q -O /usr/share/keyrings/google-chrome.gpg \
        https://dl.google.com/linux/linux_signing_key.pub \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" \
        > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome \
    NODE_ENV=production \
    EMAIL_NOTIF= \
    HOST= \
    TO= \
    USER= \
    PASSWORD= \
    SMTP_PORT= \
    SECURE= \
    WEB_SERVER_PORT= \
    ZABBIX_USERNAME= \
    ZABBIX_PASSWORD= \
    ZABBIX_IP= \
    ENABLE_SCREENSHOT=

WORKDIR /app

# Install Node dependencies
COPY package*.json ./
RUN npm ci --omit=dev \
    && npm cache clean --force

# Copy application
COPY index.js ./

# WhatsApp/Puppeteer session storage
RUN mkdir -p /app/data/session

# Create non-root Puppeteer user
RUN groupadd -r pptruser \
    && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && mkdir -p /home/pptruser/.cache \
    && chown -R pptruser:pptruser /home/pptruser /app

USER pptruser

EXPOSE 3000

CMD ["node", "index.js"]