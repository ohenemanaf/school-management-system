// Dates in the server's local time zone (set TZ for the school), not UTC.
const pad = (n) => String(n).padStart(2, '0');

const localDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localTime = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

module.exports = { localDate, localTime };
