async function status_check(sock, user) {
  setTimeout(async () => {
    sock.sendPresenceUpdate("composing", user.key.remoteJid);
  }, 1000);
}

module.exports = { status_check };
