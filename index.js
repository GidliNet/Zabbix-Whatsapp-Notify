const express = require("express");
const cors = require("cors");
const { initWhatsApp, getSock } = require("./whatsapp");
const app = express();
const dotenv = require("dotenv");
app.use(cors());
app.use(express.json());
const { getCurrentTimestamp } = require("./timestamp");
const PORT = process.env.PORT || 3000;

initWhatsApp().then(() => console.log("WhatsApp initialized"));

dotenv.config();
const WHATSAPP_USERS = process.env.WHATSAPP_USERS || "";

const Alerts = [];

app.get("/send", async (req, res) => {});

app.get("/groups", async (req, res) => {
  try {
    const sock = getSock();
    const groups = await sock.groupFetchAllParticipating();
    const groupList = Object.values(groups).map((group) => ({
      id: group.id,
      name: group.subject,
    }));
    res.json(groupList);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
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

app.get("/test", async (req, res) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(
    `http://${ZABBIX_IP}/zabbix/zabbix.php?action=dashboard.view`,
    { waitUntil: "networkidle0" },
  );
  await page.setViewport({
    width: 2560,
    height: 1440,
  });
  const client = await page.createCDPSession();
  await client.send("Emulation.setPageScaleFactor", { pageScaleFactor: 6 });
  let pageUrl = await page.url();

  console.log(pageUrl);
  if (
    pageUrl == `http://${ZABBIX_IP}/zabbix/zabbix.php?action=dashboard.view`
  ) {
    await page.goto(`http://${ZABBIX_IP}/zabbix/`, {
      waitUntil: "networkidle0",
    });

    await page.type("#name", USERNAME);
    await page.type("#password", PASSWORD);
    await page.click("#enter", { count: 1 });

    await page.waitForNavigation({ waitUntil: "networkidle0" });

    const exists = await page.evaluate(() => {
      return !!document.querySelector(".btn-kiosk");
    });

    if (!exists) {
      await page.screenshot({
        path: "./zabbix_screenshot.png",
      });
    } else {
      await page.click(".btn-kiosk", { count: 1 });
      await page.screenshot({
        path: "./zabbix_screenshot.png",
      });
    }
  }

  const sock = getSock();

  sock.sendMessage(WHATSAPP_USERS, {
    image: {
      url: "./zabbix_screenshot.png",
    },
  });
  res.status(200).json({});
});

app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`),
);

//Cron for sending alerts

cron.schedule(CRON_SCHEDULE, async () => {
  try {
    timestamp = getCurrentTimestamp();
    if (Alerts.length === 0) {
      console.log(`${timestamp} - No alerts in queue .`);
    } else {
      const { to, message } = Alerts.shift();
      console.log(
        `${timestamp} Processing alert: To:${to.toString()} , Message: ${message}`,
      );
      if (!to || !message) {
        const sock = getSock();
        const sends = await sock.sendMessage(`${to}`, { text: message });

        if (sends?.key?.id) {
          console.log("Message sent successfully:");
        } else {
          console.log(`${timestamp} - Message failed to send:`);
          Alerts.push({ to, message });
        }
      }
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
