const axios = require("axios");
const { URLSearchParams } = require("url");

const ASANA_TOKEN_URL = "https://app.asana.com/-/oauth_token";

exports.getAsanaTokens = async (code) => {
  try {
    console.log("getAsanaTokens");
    const requestBody = new URLSearchParams({
      code,
      client_id: process.env.ASANA_CLIENT_ID,
      client_secret: process.env.ASANA_CLIENT_SECRET,
      redirect_uri: process.env.AUTH_REDIRECT_URI_ASANA,
      grant_type: "authorization_code",
    });

    const response = await axios.post(ASANA_TOKEN_URL, requestBody.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    return response.data;
  } catch (error) {
    console.log("Google login error:", error);

    throw error;
  }
};
