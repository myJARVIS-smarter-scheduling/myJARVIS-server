const { google } = require("googleapis");
const axios = require("axios");
const googleOAuth2Client = require("../config/googleOAuthClient");

const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const ASANA_USERINFO_URL = "https://app.asana.com/api/1.0/users/me";

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

// NOTE: 현재 토큰에서 전달하는 정보만으로 유저정보가 사용이 가능하지만,
// 추후 프로필이미지나 workspace 전체를 얻고싶을 경우 아래 로직을 수정해 사용합니다.
exports.getAsanaUserInfo = async (accessToken) => {
  try {
    const response = await axios.get(ASANA_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const userInfo = response.data;

    return userInfo;
  } catch (error) {
    console.log("Asana user info error:", error);

    throw error;
  }
};
