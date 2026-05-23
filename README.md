# Zabbix WhatsApp Notify

A JavaScript webhook bridge that receives alerts from your Zabbix server media and queues them for delivery to a configured WhatsApp contact.

[![GitHub Stars](https://img.shields.io/github/stars/GidliNet/Zabbix-Whatsapp-Notify?style=flat-square)](https://github.com/GidliNet/Zabbix-Whatsapp-Notify)
[![Docker Image](https://img.shields.io/badge/docker-gidlinet%2Fzabbix--whatsapp--notify-blue?style=flat-square&logo=docker)](https://hub.docker.com/r/gidlinet/zabbix-whatsapp-notify)

---

## Prerequisites

The following are required before running this service:

| Requirement | Description |
|---|---|
| WhatsApp Account | An active WhatsApp account to link via QR code |
| Zabbix Server | A running Zabbix instance configured with media webhooks |
| Docker | Docker or Docker Compose installed on the host machine |

---

## Deployment

### Option 1 — Docker Run

```bash
docker run --name whatsapp-notify \
  -u 0:0 \
  --restart unless-stopped \
  -p 3002:3000 \
  -v ./session/:/app/data/session \
  --security-opt seccomp:unconfined \
  gidlinet/zabbix-whatsapp-notify:v1
```

### Option 2 — Docker Compose

```yaml
services:
  whatsapp-bot:
    image: gidlinet/zabbix-whatsapp-notify:v1
    container_name: whatsapp-notify
    user: "0:0"
    restart: unless-stopped
    ports:
      - "3002:3000"
    volumes:
      - ./session/:/app/data/session
    security_opt:
      - seccomp:unconfined
```

To start the service, run the following command from the directory containing your `docker-compose.yml`:

```bash
sudo docker compose down && sudo docker compose pull && sudo docker compose up -d
```

This command performs three sequential operations:

| Step | Command | Description |
|---|---|---|
| 1 | `docker compose down` | Stops and removes any currently running instance of the container |
| 2 | `docker compose pull` | Pulls the latest image from the registry |
| 3 | `docker compose up -d` | Starts the container in detached mode (runs in the background) |

---

## Account Setup

Once the container is running, navigate to the login page in your browser to scan the QR code:

```
http://<your-ip>:<port>/login
```

**Examples:**

```
http://localhost:3002/login
http://192.168.0.1:3002/login
```

Scan the QR code using the WhatsApp mobile app under **Linked Devices** to complete authentication.

---

## Commands

Commands are only available when sent from your own linked account (i.e., messaging yourself).

| Command | Description |
|---|---|
| `!groups` | Displays all groups and contacts associated with the linked WhatsApp account |
| `!logout` | Logs out and unlinks the connected WhatsApp account |

**Note:** Additional commands are planned for future releases. The current set is intentionally minimal to maintain stability.

---

## How It Works

```
Zabbix Server  ->  Webhook (Media)  ->  zabbix-whatsapp-notify  ->  WhatsApp Contact
```

1. Zabbix triggers an alert and dispatches a webhook to this service.
2. The service queues the incoming message.
3. The message is forwarded to the configured WhatsApp recipient specified in the `To` field.

---

## Zabbix Media Type Configuration

The following steps describe how to configure a Webhook media type in Zabbix to forward alerts to this service.

### Step 1 — Create the Media Type

Navigate to **Alerts > Media types** in the Zabbix web interface and create a new media type with the following settings:

| Field | Value |
|---|---|
| Name | Whatsapp |
| Type | Webhook |
| Timeout | 30s |

### Step 2 — Configure Parameters

Add the following parameters under the **Media type** tab:

| Name | Value |
|---|---|
| `HTTPProxy` | *(leave blank unless a proxy is required)* |
| `Message` | `{ALERT.MESSAGE}` |
| `Subject` | `{ALERT.SUBJECT}` |
| `To` | `{ALERT.SENDTO}` |
| `URL` | `http://<your-ip>:<port>/queuealert` |

Replace `<your-ip>` and `<port>` with the host address and port where the container is running (e.g., `http://172.20.35.248:3002/queuealert`).

### Step 3 — Add the Webhook Script

Paste the following script into the **Script** field:

```javascript
var req = new HttpRequest();
try {
  var params = JSON.parse(value);
  var url = params.URL;
  var message = params.Message;
  var to = params.To;
  var subject = params.Subject || "";
  var problem_host = params.problem_host || "";
  var problem_name = params.problem_name || "";
  var problem_severity = params.problem_severity || "";
  var problem_date = params.problem_date || "";

  var payload = JSON.stringify({
    to: to,
    message: message,
    subject: subject,
    problem_host: problem_host,
    problem_name: problem_name,
    problem_severity: problem_severity,
    problem_date: problem_date,
  });

  req.addHeader("Content-Type: application/json");
  var response = req.post(url, payload);
  var statusCode = req.getStatus();
  return "OK";
} catch (error) {
  Zabbix.Log(3, "[WhatsApp Webhook] Error: " + error);
}
```

### Step 4 — Configure Message Templates

Switch to the **Message templates** tab and ensure the following message types are configured:

| Message Type | Description |
|---|---|
| Problem | Sent when a problem is detected |
| Problem recovery | Sent when a problem is resolved |
| Problem update | Sent on problem acknowledgement or update |
| Service | Sent when a service problem is detected |
| Service recovery | Sent when a service problem is resolved |
| Service update | Sent on service status change |
| Discovery | Sent on network discovery events |
| Autoregistration | Sent when a new host auto-registers |
| Internal problem | Sent on internal Zabbix issues |
| Internal problem recovery | Sent when an internal issue is resolved |

### Step 5 — Assign the Media Type to a User

Navigate to **Users > Users**, select the user that should receive alerts, and under the **Media** tab add the Whatsapp media type. Set the **Send to** field to the WhatsApp contact number or group ID obtained via the `!groups` command.

---

## Dependencies

The following Node.js packages are used by this project:

| Package | Version | Description |
|---|---|---|
| [express](https://www.npmjs.com/package/express) | ^5.2.1 | Web framework used to handle incoming webhook requests |
| [whatsapp-web.js](https://www.npmjs.com/package/whatsapp-web.js) | ^1.34.7 | WhatsApp Web API client for sending messages via a linked account |
| [qrcode](https://www.npmjs.com/package/qrcode) | ^1.5.4 | Generates the QR code displayed at the `/login` endpoint for account linking |
| [cors](https://www.npmjs.com/package/cors) | ^2.8.6 | Enables Cross-Origin Resource Sharing on the Express server |

---

## Known Issues

**Root User Requirement**
The container currently requires running as root (`-u 0:0`) due to a bug that prevents the process from writing to the session directory under a non-root user. This is a known issue and will be addressed in a future release. Until resolved, omitting or changing the user flag will result in permission errors when the service attempts to persist session data to `./session/`.

---

## Issues and Contributions

To report a bug, request a feature, or contribute to the project, visit the GitHub repository:

**[https://github.com/GidliNet/Zabbix-Whatsapp-Notify](https://github.com/GidliNet/Zabbix-Whatsapp-Notify)**

---

## Disclaimer

This project is an independent, open-source integration and is not affiliated with, endorsed by, or associated with WhatsApp LLC or Meta Platforms, Inc. in any way. WhatsApp is a trademark of WhatsApp LLC. Use of this software is at your own discretion and risk. Ensure that your usage complies with [WhatsApp's Terms of Service](https://www.whatsapp.com/legal/terms-of-service).

---

*Maintained by [GidliNet](https://github.com/GidliNet)*
