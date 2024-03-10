const axios = require("axios");

const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const MICROSOFT_USERINFO_URL = "https://graph.microsoft.com/v1.0/me";
const MICROSOFT_MAILSETTING_URL =
  "https://graph.microsoft.com/v1.0/me/mailboxSettings";

exports.getGoogleUserInfo = async (accessToken) => {
  try {
    const response = await axios.get(GOOGLE_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const userInfo = response.data;

    return {
      email: userInfo.email,
      name: userInfo.name,
      timezone: userInfo.timeZone || "Korea Standard Time",
      language: userInfo.language || "ko",
    };
  } catch (error) {
    console.log("Google user info error:", error);

    throw error;
  }
};

exports.getOutlookUserInfo = async (accessToken) => {
  try {
    const userInfoResponse = await axios.get(MICROSOFT_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const mailSettingResponse = await axios.get(MICROSOFT_MAILSETTING_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const userInfo = userInfoResponse.data;
    const mailSetting = mailSettingResponse.data;

    return {
      email: userInfo.mail || userInfo.userPrincipalName,
      name: userInfo.displayName,
      timezone: mailSetting.timeZone || "Korea Standard Time",
      language:
        mailSetting.language.locale || mailSetting.language.displayName || "ko",
    };
  } catch (error) {
    console.log("Outlook user info error:", error);

    throw error;
  }
};
