const dotenv = require("dotenv");
dotenv.config();
const puppeteer = require("puppeteer");
const { getCurrentTimestamp } = require("./timestamp");
const { status_check } = require("./status");
dotenv.config();

const USERNAME = process.env.ZABBIX_USERNAME || "";
const PASSWORD = process.env.ZABBIX_PASSWORD || "";
const ZABBIX_IP = process.env.ZABBIX_IP || "";
const WHATSAPP_USERS = process.env.WHATSAPP_USERS || "";

async function zabbix_screenshot(sock, user) {
  status_check(sock, user);
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(
    `http://${ZABBIX_IP}/zabbix/zabbix.php?action=dashboard.view`,
    { waitUntil: "networkidle0" }
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
      // Use !! to convert the result of querySelector to a boolean
      return !!document.querySelector(".btn-kiosk");
    });

    if (exists) {
      console.log("Element exists via evaluate.");
    }
    if (!exists) {
      const screenshot = await page.screenshot({
        path: "zabbix_screenshot.png",
      });
    } else {
      console.log("Koisk Mode Button Exist");
      await page.click(".btn-kiosk", { count: 1 });
      const screenshot = await page.screenshot({
        path: "./zabbix_screenshot.png",
      });
    }
  }
  
  sock.sendMessage(user.key.remoteJid, {
    image: {
      url: "./zabbix_screenshot.png",
    },
  });
  await browser.close();
}

module.exports = { zabbix_screenshot };
