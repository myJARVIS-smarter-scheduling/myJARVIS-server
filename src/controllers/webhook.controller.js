/* eslint-disable */
const { Account } = require("../models/User");
const {
  fetchChangesFromGoogle,
  fetchChangesFromMicrosoft,
} = require("../services/fetchWebhookEvents");
const updateDatabaseWithChanges = require("../services/handleWebhookChanges");

exports.handleGoogleCalendarWebhook = async (req, res, next) => {
  console.log("Received Google calendar webhook");

  try {
    const channelID = req.headers["x-goog-channel-id"];
    const resourceID = req.headers["x-goog-resource-id"];
    const resourceState = req.headers["x-goog-resource-state"];
    const channelToken = req.headers["x-goog-channel-token"];
    console.log("req.headers", req.headers);
    console.log("channelID", channelID);
    console.log("resourceID", resourceID);
    console.log("resourceState", resourceState);
    console.log("channelToken", channelToken);
    console.log("req", req);

    const account = await Account.findOne({ webhookId: channelToken });
    console.log("webhook processing account", account);

    const changes = await fetchChangesFromGoogle(
      account.accessToken,
      resourceID,
      resourceState
    );

    console.log("Changes", changes);

    await updateDatabaseWithChanges(account, changes);

    return res.status(200).send("Webhook processed successfully");
  } catch (error) {
    console.error("Error processing Google calendar webhook:", error);

    return res.status(500).send("Internal Server Error");
  }
};

exports.handleMicrosoftCalendarWebhook = async (req, res, next) => {
  console.log("Received Microsoft calendar webhook");
  console.log("req.body", req.body);

  try {
    const notifications = req.body.value;

    if (notifications) {
      for (const notification of notifications) {
        const { clientState } = notification;
        const account = await Account.findOne({ webhookId: clientState });

        if (!account) {
          console.log("No account matches the provided clientState");

          return res.status(404).send("Account not found");
        }

        console.log("microsoft account", account);

        const changes = await fetchChangesFromMicrosoft(
          notification,
          account.accessToken
        );

        if (notification.changeType !== "deleted") {
          await updateDatabaseWithChanges(changes);
        }

        await account.save();
      }
    }
    return res.status(200).send("Webhook processed successfully");
  } catch (error) {
    console.error("Error processing Microsoft calendar webhook:", error);

    if (error.response) {
      console.error("Error response data:", error.response.data);
    }

    return res.status(500).send("Internal Server Error");
  }
};
