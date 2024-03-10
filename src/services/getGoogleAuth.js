const { google } = require("googleapis");
const axios = require("axios");

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.AUTH_REDIRECT_URI_GOOGLE,
);

exports.getGoogleAuthUrl = () => {
  const scopes = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/calendar.events",
  ];

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
  });
};

exports.googleLogin = async (code) => {
  try {
    const tokens = await axios.post(GOOGLE_TOKEN_URL, {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.AUTH_REDIRECT_URI_GOOGLE,
      grant_type: "authorization_code",
    });

    return { tokens: tokens.data };
  } catch (error) {
    console.log("Google login error:", error);

    throw error;
  }
};
