FROM ubuntu:24.04
# Install only the bare minimum Chromium headless dependencies
# and clean apt cache in the same layer to keep image small
RUN apt-get update -y 
RUN apt-get install wget git curl  -y
RUN wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
RUN apt-get install ./google-chrome-stable_current_amd64.deb -y

RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.7/install.sh | bash
RUN /bin/bash -c "source \$HOME/.nvm/nvm.sh && nvm install lts/hydrogen && nvm use lts/hydrogen"


RUN git clone https://github.com/GidliNet/Zabbix-Whatsapp-Notify.git
WORKDIR Zabbix-Whatsapp-Notify 
RUN /bin/bash -c "npm install"


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
RUN rm -rf /var/lib/apt/lists/*


# WORKDIR /app

# # Install dependencies first (better layer caching)
# COPY package*.json ./
# RUN npm ci --omit=dev && npm cache clean --force
# # Session persistence directory
# RUN mkdir -p /app/lib/
# # Copy source
# COPY ./index.js .
# COPY ./lib/mail.js ./lib
# COPY ./lib/pupperter.js ./lib
# # Session persistence directory
# RUN mkdir -p /app/data/session

# # Add user so we don't need --no-sandbox.
# RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
#     && mkdir -p /home/pptruser/Downloads \
#     && chown -R pptruser:pptruser /home/pptruser

# USER pptruser

EXPOSE 3000

CMD ["node", "index.js"]