const { google } = require("googleapis");

const googleOAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.AUTH_REDIRECT_URI_GOOGLE,
);

module.exports = googleOAuth2Client;
