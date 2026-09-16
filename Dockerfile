# FROM node:18-slim

# # Install only the bare minimum Chromium headless dependencies
# # and clean apt cache in the same layer to keep image small
# RUN apt-get update \
#     && apt-get install -y wget gnupg \
#     && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
#     && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
#     && apt-get update \
#     && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
#       --no-install-recommends \
#     && rm -rf /var/lib/apt/lists/*

# # Use system Chromium, skip Puppeteer's bundled download
# ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
#     PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
#     NODE_ENV=production \
#     EMAIL_NOTIF= \
#     HOST= \
#     TO= \
#     USER= \
#     PASSWORD= \
#     SMTP_PORT= \
#     SECURE= \
#     WEB_SERVER_PORT= \
#     ZABBIX_USERNAME= \
#     ZABBIX_PASSWORD= \
#     ZABBIX_IP= \
#     ENABLE_SCREENSHOT= 

# WORKDIR /app

# # Install dependencies first (better layer caching)
# COPY package*.json ./
# RUN npm ci --only=production
# #ci --omit=dev && npm cache clean --force

# # Copy source
# COPY index.js .

# # Session persistence directory
# RUN mkdir -p /app/data/session

# # Add user so we don't need --no-sandbox.
# RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
#     && mkdir -p /home/pptruser/Downloads \
#     && chown -R pptruser:pptruser /home/pptruser

# USER pptruser

# EXPOSE 3000

# CMD ["node", "index.js"]

# 1. Use an official Node.js runtime as the base image
FROM node:20-alpine

# 2. Set the working directory inside the container
WORKDIR /usr/src/app

# 3. Copy ONLY dependency files first (Crucial for caching)
COPY package*.json ./

# 4. Install dependencies (Clean install)
RUN npm ci --only=production

# 5. Copy the rest of your application source code
COPY . .

# 6. Expose the port your app runs on
EXPOSE 3000

# 7. Define the command to run your app
CMD ["node", "index.js"]
