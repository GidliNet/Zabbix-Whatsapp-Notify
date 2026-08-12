FROM node:18-slim

# Install only the bare minimum Chromium headless dependencies
# and clean apt cache in the same layer to keep image small
RUN apt-get update \
    && apt-get install -y wget gnupg 
    #\
    # && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    # && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    # && apt-get update \
    # && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    #   --no-install-recommends \
    # && rm -rf /var/lib/apt/lists/*

ENV CHROME_VERSION=145.0.7632.159-1
RUN wget -q https://dl.google.com/linux/chrome/deb/pool/main/g/google-chrome-stable/google-chrome-stable_${CHROME_VERSION}_amd64.deb
RUN apt-get -y update
RUN apt-get install -y ./google-chrome-stable_${CHROME_VERSION}_amd64.deb

# Use system Chromium, skip Puppeteer's bundled download
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium 
ENV NODE_ENV=production 
ENV EMAIL_NOTIF= 
ENV HOST= 
ENV TO= 
ENV USER= 
ENV PASSWORD= 
ENV SMTP_PORT= 
ENV SECURE= 
ENV WEB_SERVER_PORT= 
ENV ZABBIX_USERNAME= 
ENV ZABBIX_PASSWORD= 
ENV ZABBIX_IP= 
ENV ENABLE_SCREENSHOT= 

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
# Session persistence directory
RUN mkdir -p /app/lib/
# Copy source
COPY ./index.js .
COPY ./lib/mail.js ./lib
COPY ./lib/pupperter.js ./lib
# Session persistence directory
RUN mkdir -p /app/data/session

# Add user so we don't need --no-sandbox.
RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && chown -R pptruser:pptruser /home/pptruser

USER pptruser

EXPOSE 3000

CMD ["node", "index.js"]