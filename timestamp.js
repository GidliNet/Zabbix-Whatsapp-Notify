  function getCurrentTimestamp() {
  const now = new Date();
  const timestamp = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false, // Use 24-hour time
  }).format(now);

  return timestamp;
}

module.exports = { getCurrentTimestamp };