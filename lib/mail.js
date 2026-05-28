const dotenv = require("dotenv");
const nodemailer = require("nodemailer");
dotenv.config();

const mail = async () => {
  const HOST = process.env.HOST | "";
  const TO = process.env.TO | "";
  const USER = process.env.USER | "";
  const PASSWORD = process.env.PASSWORD | "";
  const PORT = process.env.SMTP_PORT | "";
  const SECURE = process.env.SECURE | "";
  let transporter = nodemailer.createTransport({
    host: HOST,
    port: PORT,
    secure: SECURE,
    auth: {
      user: USER,
      pass: PASSWORD,
    },
  });

  return transporter;
};

const recepient_processor = async (TO) => {
  const Mails = TO.splice(",");
  return Mails;
};

module.exports = { recepient_processor, mail };
