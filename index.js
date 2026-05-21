const { Client, LocalAuth } = require("whatsapp-web.js");
const fs = require("node:fs");
const express = require("express");
const cors = require("cors");
const QRCode = require("qrcode");
const app = express();
const port = 3000;

var qrcode = require("qrcode-terminal");
const { create } = require("node:domain");

const main = async () => {
  const client = new Client({
    deviceName: "ZabbixAlerting",
    authStrategy: new LocalAuth({
      clientId: "Alerted",
      dataPath: "./data/session",
    }),
    puppeteer: {
      executablePath: "/usr/bin/google-chrome-stable",
      args: [
        "--no-sandbox", // ← required in Docker
        "--disable-setuid-sandbox", // ← required in Docker
        "--disable-dev-shm-usage", // ← prevents /dev/shm crashes
        "--disable-gpu", // ← no GPU in container
        "--no-first-run",
        "--no-zygote", // ← helps in restricted environments
        "--single-process", // ← use if --no-zygote alone doesn't work
      ],
    },
  });

  app.listen(port, () => {});
  app.use(cors());
  app.use(express.json());
  let code = "";
  let isReady = false;

  let Alerts = [];

  client.once("ready", () => {
    console.log("Whatsapp Client is ready.");
    isReady = true;

    setInterval(async () => {
      if (Alerts.length === 0) return;

      const alert = Alerts.shift();

      try {
        await client.sendMessage(alert.to, alert.message);
      } catch (err) {
        alert.retries = (alert.retries || 0) + 1;
        if (alert.retries < 3) {
          Alerts.unshift(alert); // put it back at the front
        } else {
        }
      }
    }, 1000);
  });

  client.on("qr", async (qr) => {
    console.log(
      "Not authentication please go to https://localhost:3000/login or https://ip_address:3000/login",
    );
    code = await QRCode.toDataURL(qr);
  });

  client.on("message_create", async (created_message) => {
    const chat = await created_message.getChat();
    if (
      created_message.body.startsWith("!") &&
      created_message.from === client.info.me._serialized &&
      created_message.author == created_message.to
    ) {
      if (created_message.body.includes("!groups")) {
        const chats = await client.getChats();

        // Build the reply message
        const lines = chats.map((chat, index) => {
          const name = chat.name || "Unknown";
          const id = chat.id._serialized;

          return `${index + 1}.Name: ${name}\n     ID: ${id}`;
        });

        const reply = `*Chat List (${chats.length} total):*\n\n${lines.join("\n\n")}`;

        await created_message.reply(reply);
      }
    }
  });

  client.on("message", async (message) => {
    if (message.body.startsWith("!")) {
      if (message.body.includes("!groups")) {
      }
    }
  });

  app.get("/login", (req, res) => {
    if (code == "" && isReady == false) {
      res.send(`<html>
          <body>
          </body>
          <h3>Checking if bot is already linked...</h3>
           <script>
          let timer=5
setInterval(function() {
  if(timer==0){
    location.reload();
    timer=15
  }else{
      timer--
    }
}, 1000);
          </script>
          </html>`);
    } else if (code == "" && isReady == true) {
      res.send(`<html>
          <body>
          </body>
          <h3>Bot is already linked to an account . To view the commands please do <b>!commands</b> to any group or the account you linked .</h3>
          
          </html>`);
    } else if (code !== "" && isReady == true) {
      res.send(`   <html>
          <body>
          </body>
          <h3>Bot is already linked to an account . To view the commands please do <b>!commands</b> to any group or the account you linked .</h3>
          
          </html>`);
    } else {
      res.send(`
          <html>
          <body>
          </body>
          <h1>It seems this bot has not linked and account . Scan the QR Code using whatsapp link to login to this bot.</h1>
          <h3 style="color:orange">If already linked your account , Refresh this page to see status.</h3>
          <h2>This page will reload after <b><span id="timer">15</span> Seconds</b> to retrieve the latest QR Code.</h2>
          <iframe src="${code}" width="300px" height="300px" frameBorder="0"></iframe>
          <script>
          let timer=15
setInterval(function() {
  if(timer==0){
    location.reload();
    timer=15
  }else{
    if(timer == 10){
    timer--
    document.getElementById("timer").textContent=timer;
    document.getElementById("timer").style.color="orange";
    }
      if(timer == 5){
       timer--
       document.getElementById("timer").textContent=timer;
    document.getElementById("timer").style.color="red";
    }
    else{
      timer--
  document.getElementById("timer").textContent=timer;
  }
    }
}, 1000);
          </script>
          </html>
          `);
    }
  });

  app.post("/queuealert", async (req, res) => {
    try {
      console.log("Received alert queue request:", req.body);
      const { to, message } = req.body;
      if (!to || !message) {
        return res
          .status(400)
          .json({ error: "Missing 'to' or 'message' in request body" });
      }
      Alerts.push({ to, message });
      res.json({ success: true, message: "Alert queued" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/", (req, res) => {
    res.send("Hello World!");
  });

  client.initialize();
};

main();
