const schedule = require("node-schedule");
const { Event, Invitee } = require("./models");
const { google } = require("googleapis");
const QRCode = require("qrcode");
const moment = require("moment");
const dotenv = require("dotenv");
const nodemailer = require("nodemailer");

dotenv.config();
const transporter = nodemailer.createTransport({
  service: "gmail",
  // host: "smtp.ethereal.email",
  // port: 587,
  // secure: true,
  auth: {
    user: process.env.user,
    pass: process.env.windows1,
  },
});

const job = schedule.scheduleJob("59 23 * * *", async function () {
  console.log("INSIDE JOB");
  const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_KEY,
    process.env.CLIENT_SECRET,
    "http://localhost:5000/api/admin/auth/success"
  );
  console.log("JOB EXECUTING");
  const events = await Event.findAll({});

  events.map((event) => {
    schedule.scheduleJob(
      `1 * * ${moment(event.dataValues.registrationDeadline).date()} ${
        moment(event.dataValues.registrationDeadline).month() + 1
      } *`,
      async function (date) {
        console.log("DEADLINE EXECUTED");

        oauth2Client.setCredentials({
          refresh_token: process.env.refresh_token,
        });
        oauth2Client.refreshAccessToken(function (err, tokens) {
          oauth2Client.setCredentials(tokens);
        });

        const response = await calendar.events.get({
          auth: oauth2Client,
          calendarId: "primary",
          eventId: event.dataValues.eventId,
        });

        response?.data?.attendees?.map((att) => {
          if (att.responseStatus === "accepted") {
            Invitee.findOne({
              where: { email: att.email, eventId: event.dataValues.id },
            }).then(async (e) => {
              let img = await QRCode.toDataURL(
                `${att.email} ${event.dataValues.id}`
              );

              e.qrCode = img;
              await e.save();
              transporter.sendMail(
                {
                  from: process.env.user,
                  to: att.email,
                  subject: event.dataValues.title,
                  attachDataUrls: true,
                  html:
                    'The QR Code for Event is <br/> <br/> <img src="' +
                    img +
                    '">',
                },
                (error, info) => {
                  if (error) {
                    return console.log(error);
                  }
                  console.log("Message sent");
                }
              );
            });
          }
        });
      }
    );
  });
});

module.exports = job;

// const token = {
//   access_token:
//     "ya29.a0AVvZVsq1HDI0xIH5CFo90f7x6FHbHUbnE1ROGaT9jWG-uPIwG65z91IMRoUMM23uWSYPoI4h60RFfBvV8e0qnKeQ2j-YiC2dFhBjHXSeQYn2NP5RBFskUBRN93_5RlnQZMm-uEBZFJRyiu9WV_YrgYPWafslaCgYKAQsSARESFQGbdwaIAlpg5vRWaIT9JhrMutiEWA0163",
//   refresh_token: process.env.refresh_token,
//   scope:
//     "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar",
//   token_type: "Bearer",
//   expiry_date: process.env.expiry_date,
// };
// oauth2Client.setCredentials(token);
