const makeWASocket = require("@whiskeysockets/baileys").default;
const {
  useMultiFileAuthState,
  DisconnectReason,
} = require("@whiskeysockets/baileys");
const Pino = require("pino");
const QRCode = require("qrcode");
const NodeCache = require("node-cache");
const fs = require("fs/promises");
const puppet = require("./puppet");
let sock = null;
let isInitializing = false;
const ping = require("net-ping");
const ping_calculation = require("./ping").ping_calculation;
const groupCache = new NodeCache({ stdTTL: 5 * 60, useClones: false });
const { status_check } = require("./status");
async function initWhatsApp() {
  if (sock || isInitializing) return sock;
  isInitializing = true;

  const { state, saveCreds } = await useMultiFileAuthState("auth_info");

  sock = makeWASocket({
    auth: state,
    browser: ["NodeJS API", "Chrome", "1.0"],
    logger: Pino({ level: "silent" }),
    cachedGroupMetadata: async (jid) => groupCache.get(jid),
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", ({ type, messages }) => {
    if (type == "notify") {
      for (const message of messages) {
        if (message.message.conversation == "!zabbix" && !message.key.fromMe) {
          status_check(sock, message);
          sock.sendMessage(message.key.remoteJid, {
            text: `Hi ${message.pushName}, Preparing Zabbix screenshot, This may take a while. please wait...`,
          });
          status_check(sock, message);
          puppet.zabbix_screenshot(sock, message);
        }
        if (message.message.conversation == "!help" && !message.key.fromMe) {
          sock.sendMessage(message.key.remoteJid, {
            text: `Available Commands:\n1.!zabbix - Get Zabbix Dashboard Screenshot\n2.!help - List Available Commands`,
          });
        }
        if (
          message.message.conversation.startsWith("!ping") &&
          !message.key.fromMe
        ) {
          const commands = message.message.conversation;
          sock.sendMessage(message.key.remoteJid, {
            text: `Hi ${message.pushName}, Preparing Ping results, This may take a while. please wait...`,
          });
          ping_calculation(sock, message);
        }
      }
    } else {
    }
  });
  sock.ev.on("connection.update", async (update) => {
    const { qr, connection, lastDisconnect } = update;

    if (qr) {
      console.log(await QRCode.toString(qr, { type: "terminal", small: true }));
    }

    if (connection === "close") {
      const error = lastDisconnect?.error;
      const statusCode = error?.output?.statusCode;
      const reason = error?.output?.payload?.error;

      console.log("Connection closed:", statusCode, reason);

      sock = null;
      isInitializing = false;

      if (reason === "conflict") {
        console.error("❌ Logged in elsewhere. Exiting.");
        process.exit(1);
      }

      // 🔑 Logged out → reset auth & show NEW QR
      if (statusCode === DisconnectReason.loggedOut) {
        console.log("🔐 Logged out. Resetting auth and generating new QR...");
        await fs.rm("auth_info", { recursive: true, force: true });

        // slight delay avoids race conditions
        setTimeout(initWhatsApp, 1000);
        return;
      }

      // 🔁 Normal reconnect
      console.log("🔁 Reconnecting...");
      setTimeout(initWhatsApp, 5000);
    }

    if (connection === "open") {
      console.log("✅ WhatsApp connected");
      isInitializing = false;
    }
  });

  return sock;
}

function getSock() {
  if (!sock) throw new Error("WhatsApp not initialized");
  return sock;
}

module.exports = { initWhatsApp, getSock };
