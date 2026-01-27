const ping = require("net-ping");

const ping_calculation = async (sock, message) => {
  const commands = message.message.conversation;
  if (commands.split(" ").length > 1) {
    const pingTarget = commands.split(" ")[1];


    
  } else {
    sock.sendMessage(message.key.remoteJid, {
      text: `Usage: !ping <IP_ADDRESS_OR_HOSTNAME>`,
    });
  }
};

module.exports = { ping_calculation };
