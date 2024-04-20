const axios = require("axios");
const { google } = require("googleapis");
const { randomUUID } = require("crypto");
const { Account } = require("../models/User");
const googleOAuth2Client = require("../config/googleOAuthClient");

exports.setupGoogleWebhook = async (accountId, accessToken) => {
  googleOAuth2Client.setCredentials({ access_token: accessToken });

  const account = await Account.findById(accountId);

  if (account.webhookId && new Date() < new Date(account.webhookExpiration)) {
    console.log("Goolge Webhook already set up and active.");

    return;
  }

  const calendar = google.calendar({ version: "v3", auth: googleOAuth2Client });
  const uniqueId = randomUUID();

  try {
    const response = await calendar.events.watch({
      calendarId: "primary",
      requestBody: {
        id: uniqueId,
        type: "web_hook",
        address: "https://api.myjarvis.co/webhook/google/calendar",
        token: "verification-token",
      },
    });

    console.log("Google Webhook set up successfully:", response.data);

    const expirationDate = new Date(parseInt(response.data.expiration, 10));

    account.webhookId = uniqueId;
    account.webhookExpiration = Date.now() + expirationDate;

    await account.save();
  } catch (error) {
    console.error("Failed to set up webhook:", error);

    throw error;
  }
};

exports.setupMicrosoftWebhook = async (accountId, accessToken) => {
  const account = Account.findById(accountId);

  if (account.webhookId && new Date() < new Date(account.webhookExpiration)) {
    console.log("Microsoft Webhook already set up and active.");

    return;
  }

  const uniqueId = randomUUID();

  try {
    const response = await axios({
      method: "post",
      url: "https://graph.microsoft.com/v1.0/subscriptions",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      data: {
        changeType: "created,updated,deleted",
        notificationUrl: "https://api.myjarvis.co/webhook/microsoft/calendar",
        resource: "me/events",
        expirationDateTime: new Date(
          Date.now() + 3600 * 1000 * 24,
        ).toISOString(),
        clientState: uniqueId,
      },
    });

    console.log("Microsoft webhook set up successfully:", response.data);

    account.webhookId = uniqueId;
    account.webhookExpiration = new Date(response.data.expirationDateTime);

    await account.save();
  } catch (error) {
    console.error("Failed to set up Microsoft webhook:", error);

    throw error;
  }
};
