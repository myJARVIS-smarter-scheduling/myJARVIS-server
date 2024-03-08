const { google } = require("googleapis");

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.AUTH_REDIRECT_URI,
);

exports.getGoogleAuthUrl = () => {
  const scopes = ["https://www.googleapis.com/auth/calendar"];

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
  });
};

exports.googleLogin = async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    return tokens;
  } catch (error) {
    console.log("Google login error:", error);

    throw error;
  }
};
