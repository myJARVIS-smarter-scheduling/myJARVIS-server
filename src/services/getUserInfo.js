const { google } = require("googleapis");
const axios = require("axios");
const googleOAuth2Client = require("../config/googleOAuthClient");

const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

exports.getGoogleUserInfo = async (accessToken, refreshToken) => {
  try {
    googleOAuth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    const response = await axios.get(GOOGLE_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const userInfo = response.data;

    const calendar = google.calendar({
      version: "v3",
      auth: googleOAuth2Client,
    });

    const calendarResponse = await calendar.calendarList.get({
      calendarId: "primary",
    });
    const calendarTimezone = calendarResponse.data.timeZone;

    return {
      email: userInfo.email,
      name: userInfo.name,
      timezone: calendarTimezone,
      language: userInfo.locale || "ko",
    };
  } catch (error) {
    console.log("Google user info error:", error);

    throw error;
  }
};
