/* eslint-disable */

const { google } = require("googleapis");
const { User } = require("../models/User");
const {
  saveNewUserTokens,
  saveNewAccountTokens,
} = require("../utils/saveNewTokens");

const googleOAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const refreshUserToken = async (user, provider) => {
  if (provider === "google") {
    googleOAuth2Client.setCredentials({
      access_token: user.accessToken,
      refresh_token: user.refreshToken,
    });

    try {
      await googleOAuth2Client.getTokenInfo(user.accessToken);
    } catch (error) {
      const { credentials } = await googleOAuth2Client.refreshAccessToken();
      await saveNewUserTokens(
        user._id,
        credentials.access_token,
        credentials.refresh_token,
        credentials.expiry_date
      );
    }
  }
};

const refreshAccountTokens = async (accounts) => {
  await Promise.all(
    accounts.map(async (account) => {
      if (account.provider === "google") {
        googleOAuth2Client.setCredentials({
          access_token: account.accessToken,
          refresh_token: account.refreshToken,
        });

        try {
          await googleOAuth2Client.getTokenInfo(account.accessToken);
        } catch (error) {
          const response = await googleOAuth2Client.refreshAccessToken();
          const { credentials } = response;

          await saveNewAccountTokens(
            account._id,
            credentials.access_token,
            credentials.refresh_token,
            credentials.expiry_date
          );
        }
      }
    })
  );
};

exports.verifyToken = async (req, res, next) => {
  const { userId, accessToken } = req.cookies;
  const { provider } = req.body;

  if (!userId || !accessToken) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await refreshAccountTokens(user.accountList);
    await refreshUserToken(user, provider);

    if (provider === "google") {
      res.cookie("accessToken", user.accessToken, {
        httpOnly: true,
        secure: true,
        expires: new Date(user.tokenExpiredAt),
      });

      res.cookie("userId", user._id.toString(), {
        httpOnly: true,
        secure: true,
        expires: new Date(user.tokenExpiredAt),
      });
    }

    next();
  } catch (error) {
    console.error("Verification error:", error);

    return res.status(500).json({ message: "Internal Server Error" });
  }
};
