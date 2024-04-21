const axios = require("axios");
const crypto = require("crypto");
const { google } = require("googleapis");
const { Account } = require("../models/User");
const googleOAuth2Client = require("../config/googleOAuthClient");

exports.setupGoogleWebhook = async (accountId, accessToken) => {
  googleOAuth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({
    version: "v3",
    auth: googleOAuth2Client,
  });

  const account = await Account.findById(accountId);
  const { webhookId, webhookExpiration } = account;
  const isValidate = new Date() < new Date(webhookExpiration);

  const uniqueId = account.webhookId || crypto.randomUUID();

  try {
    if (!webhookId || !isValidate) {
      const response = await calendar.events.watch({
        calendarId: "primary",
        requestBody: {
          id: uniqueId,
          type: "web_hook",
          address: "https://api.myjarvis.co/webhook/google/calendar",
          token: uniqueId,
        },
      });

      console.log("Google Webhook set up successfully:", response.data);

      const expirationDate = new Date(
        Date.now() + Number(response.data.expiration),
      );
      console.log("Webhook expiration date:", expirationDate);

      account.webhookId = uniqueId;
      account.webhookExpiration = expirationDate;

      await account.save();
    } else {
      console.log("Google Webhook already set up and active.");
    }
  } catch (error) {
    console.error("Failed to set up webhook:", error);

    throw error;
  }
};

exports.setupMicrosoftWebhook = async (accountId, accessToken) => {
  const account = await Account.findById(accountId);
  const { webhookId, webhookExpiration } = account;
  const isValidate = new Date() < new Date(webhookExpiration);

  const uniqueId = account.webhookId || crypto.randomUUID();

  try {
    if (!webhookId || !isValidate) {
      const response = await axios.post(
        "https://graph.microsoft.com/v1.0/subscriptions",
        {
          changeType: "created,updated,deleted",
          notificationUrl: "https://api.myjarvis.co/webhook/microsoft/calendar",
          resource: "me/events",
          expirationDateTime: new Date(
            Date.now() + 3600 * 1000 * 24,
          ).toISOString(),
          clientState: uniqueId,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      console.log("Microsoft webhook set up successfully:", response.data);

      account.webhookId = uniqueId;
      account.webhookExpiration = new Date(response.data.expirationDateTime);

      await account.save();
    } else {
      console.log("Microsoft Webhook already set up and active.");
    }
  } catch (error) {
    console.error("Failed to set up Microsoft webhook:", error);

    throw error;
  }
};
