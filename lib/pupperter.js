const dotenv = require("dotenv");
const puppeteer = require("puppeteer");
dotenv.config();

const USERNAME = process.env.ZABBIX_USERNAME || "";
const PASSWORD = process.env.ZABBIX_PASSWORD || "";
const ZABBIX_IP = process.env.ZABBIX_IP || "";

async function zabbix_screenshot(ZABBIX_DASHBOARD_ID) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  //To login page if
  await page.goto(
    `http://${ZABBIX_IP}/zabbix/zabbix.php?action=dashboard.view`,
    { waitUntil: "networkidle0" },
  );
  await page.setViewport({
    width: 1920,
    height: 1080,
  });
  const client = await page.createCDPSession();
  let pageUrl = await page.url();
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
    console.log(ZABBIX_DASHBOARD_ID)
    await page.goto(
      `http://${ZABBIX_IP}/zabbix/zabbix.php?action=dashboard.view&dashboardid=${ZABBIX_DASHBOARD_ID}&from=now-5m&to=now`,
      {
        waitUntil: "networkidle0",
      },
    );

    const exists = await page.evaluate(() => {
      return !!document.querySelector(".btn-kiosk");
    });

    if (exists) {
      console.log("Element exists via evaluate.");
    }
    if (!exists) {
      const screenshot = await page.screenshot({
        type: "png",
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
  await browser.close();
}

module.exports = { zabbix_screenshot };
