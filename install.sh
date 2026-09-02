#!/bin/bash
set -e

APP_NAME="ZABBIX-WHATSAPP-NOTIFY"
APP_DIR="/opt/${APP_NAME}"
REPO_URL="https://github.com/GidliNet/zabbix-ping-trapper.git"
SERVICE_FILE="/etc/systemd/system/${APP_NAME}.service"
CONFIG_DIR="${APP_DIR}/Config"

echo "Installing ${APP_NAME}..."

# -----------------------------
# Privilege check
# -----------------------------
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (use sudo)"
  exit 1
fi

# -----------------------------
# System dependencies
# -----------------------------
echo "Updating system..."
apt-get update

echo "Installing dependencies (git, curl)..."
apt-get install -y git curl build-essential python3 make g++


# -----------------------------
# Install NVM (root)
# -----------------------------
export NVM_DIR="/root/.nvm"
if [ ! -d "$NVM_DIR" ]; then
  echo "⬇Installing NVM..."
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
fi

# Load NVM
source "$NVM_DIR/nvm.sh"

# -----------------------------
# Install Node.js v18 (Hydrogen)
# -----------------------------
echo "⬇Installing Node.js lts/hydrogen (v18)..."
nvm install lts/hydrogen
nvm use lts/hydrogen

# -----------------------------
# Clone application
# -----------------------------
echo "Installing application to ${APP_DIR}..."
rm -rf "$APP_DIR"
git clone "$REPO_URL" "$APP_DIR"


cd "$APP_DIR"

# -----------------------------
# Install Node dependencies
# -----------------------------
echo "Installing Node.js dependencies..."
npm install --omit=dev

# -----------------------------
# Create config directory
# -----------------------------
echo "Creating config directory..."
mkdir -p "$CONFIG_DIR"

# -----------------------------
# Create .env
# -----------------------------
# echo "Creating .env file..."
# cat <<EOF > "$APP_DIR/.env"

# EOF

# -----------------------------
# Create configuration.json
# -----------------------------
# echo "Creating configuration.json..."
# cat <<EOF > "$CONFIG_DIR/configuration.json"
# [
#   {
#     "IP": "8.8.8.8",
#     "PING_TIMEOUT": 600,
#     "RETRIES": 0,
#     "PACKETLOSS_INTERVAL": 10,
#     "TrapperPing": {
#       "server": "172.20.1.1",
#       "host": "isp-core",
#       "key": "Trapper.Ping.Google"
#     },
#     "TrapperPacketloss": {
#       "server": "172.20.1.1",
#       "host": "isp-core",
#       "key": "Trapper.PacketLoss.Google"
#     }
#   },
#   {
#     "IP": "1.1.1.1",
#     "PING_TIMEOUT": 600,
#     "RETRIES": 0,
#     "TrapperPing": {
#       "server": "172.20.1.1",
#       "host": "isp-core",
#       "key": "Trapper.Ping.Cloudflare"
#     },
#     "TrapperPacketloss": {
#       "server": "172.20.1.1",
#       "host": "isp-core",
#       "key": "Trapper.PacketLoss.Cloudflare"
#     }
#   },
#   {
#     "IP": "9.9.9.9",
#     "PING_TIMEOUT": 600,
#     "RETRIES": 0,
#     "TrapperPing": {
#       "server": "172.20.1.1",
#       "host": "isp-core",
#       "key": "Trapper.Ping.Cloud9"
#     },
#     "TrapperPacketloss": {
#       "server": "172.20.1.1",
#       "host": "isp-core",
#       "key": "Trapper.PacketLoss.Cloud9"
#     }
#   }
# ]
# EOF

# -----------------------------
# Create start.sh
# -----------------------------
echo "Creating start.sh..."
cat <<'EOF' > "$APP_DIR/start.sh"
#!/bin/bash

export NVM_DIR="/root/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

nvm use lts/hydrogen >/dev/null

exec node index.js
EOF

chmod +x "$APP_DIR/start.sh"

# -----------------------------
# Create systemd service
# -----------------------------
echo "Creating systemd service..."
cat <<EOF > "$SERVICE_FILE"
[Unit]
Description=Zabbix Ping Trapper
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}
ExecStart=${APP_DIR}/start.sh
Restart=on-failure
RestartSec=5
User=root
Group=root
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# -----------------------------
# Enable & start service
# -----------------------------
systemctl daemon-reload
systemctl enable "$APP_NAME"
systemctl restart "$APP_NAME"

echo "Installation complete!"
echo "Edit config files if needed:"
echo "  - ${APP_DIR}/.env"
echo "  - ${CONFIG_DIR}/configuration.json"
echo
systemctl status "$APP_NAME" --no-pager