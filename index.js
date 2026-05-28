const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");
const { mail, recepient_processor } = require("./lib/mail");
const { zabbix_screenshot } = require("./lib/pupperter");
const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const QRCode = require("qrcode");

dotenv.config();
const port = process.env.WEB_SERVER_PORT | 3000;
const TO = process.env.TO | "";
const ENABLE_SCREENSHOT = process.env.ENABLE_SCREENSHOT;
const main = async () => {
  let code = "";
  let isReady = false;
  let Alerts = [];

  const app = express();

  const client = new Client({
    deviceName: "ZabbixAlerting",
    authStrategy: new LocalAuth({
      clientId: "Alerted",
      dataPath: "/data/session",
    }),
    puppeteer: {
      executablePath:
        process.platform !== "win32" ? "/usr/bin/google-chrome-stable" : null,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
      ],
    },
  });

  app.listen(port, () => {});
  app.use(cors());
  app.use(express.json());

  client.once("ready", async () => {
    console.log("Whatsapp Client ready.");
    isReady = true;

    // const recepient = await recepient_processor(TO);

    // recepient.forEach((recept) => {
    //   setInterval(async () => {
    //     const transporter = await mail().sendMail({
    //       from: `"Zabbix Alert" <alert@gidli.net>`,
    //       to: recepient,
    //       subject: "Whatsapp Zabbix Alert",
    //       text: "Whatsapp got unlinked to your docker Whatsapp Zabbix Alert",
    //     });
    //   }, 1000);
    // });

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
      if (created_message.body.includes("!logout")) {
        client.logout();
      }
      if (created_message.body.includes("!groups")) {
        const chats = await client.getChats();
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
      console.log("Screenshot status:", ENABLE_SCREENSHOT);
      if (ENABLE_SCREENSHOT) {
        if (
          message.body.includes("!screenshot") ||
          message.body.includes("!ss")
        ) {
          const parameters = message.body.split(" ");

          if (parameters.length <= 3) {
            if (parameters[1] == "help") {
              message.reply(`To use the command do \`!screenshot parameter\`
Parameters:
- Zabbix Dashboard ID : \`!screenshot 1\`
- Help: \`!screenshot help\`
Allias(Command alternative):
\`!ss\``);
            } else if (parameters[1] !== undefined && !isNaN(parameters[1])) {
              await zabbix_screenshot(parameters[1]);
              const media = await MessageMedia.fromFilePath(
                "./zabbix_screenshot.png",
              );
              await client.sendMessage(message.from, media, {
                sendMediaAsHd: true,
              });
            } else {
              await zabbix_screenshot(1);
              const media = await MessageMedia.fromFilePath(
                "./zabbix_screenshot.png",
              );
              await client.sendMessage(message.from, media, {
                sendMediaAsHd: true,
              });
            }
          } else {
            client.sendMessage(
              message.from,
              "Command `!screenshot` only requires 1 Parameter . Use `!screenshot help` to view available options.",
            );
          }
        } else if (message.body.includes("!help")) {
          client.sendMessage(
            message.from,
            `Command List
- \`!screenshot help\`
- \`!help\`
`,
          );
        } else {
          client.sendMessage(
            message.from,
            "This command is not available. Please `!help` to see available command.",
          );
        }
      } else {
        client.sendMessage(message.from, "Screenshot command is disabled.");
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
