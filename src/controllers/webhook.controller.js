/* eslint-disable */
const { Account } = require("../models/User");
const {
  fetchChangesFromGoogle,
  fetchChangesFromMicrosoft,
} = require("../services/fetchWebhookEvents");
const updateDatabaseWithChanges = require("../services/handleWebhookChanges");

exports.handleGoogleCalendarWebhook = async (req, res, next) => {
  try {
    const resourceID = req.headers["x-goog-resource-id"];
    const resourceState = req.headers["x-goog-resource-state"];
    const channelToken = req.headers["x-goog-channel-token"];

    const account = await Account.findOne({ webhookId: channelToken });

    const changes = await fetchChangesFromGoogle(
      account.accessToken,
      resourceID,
      resourceState
    );

    await updateDatabaseWithChanges(account, changes);

    return res.status(200).send("Webhook processed successfully");
  } catch (error) {
    console.error("Error processing Google calendar webhook:", error);

    return res.status(500).send("Internal Server Error");
  }
};
