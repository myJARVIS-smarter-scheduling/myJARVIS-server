const { Account } = require("../models/User");
const {
  fetchChangesFromGoogle,
  fetchChangesFromMicrosoft,
} = require("../services/fetchWebhookEvents");
const {
  updateDatabaseWithChanges,
} = require("../services/handleWebhookChanges");

exports.handleGoogleCalendarWebhook = async (req, res, next) => {
  console.log("Received Google calendar webhook");

  try {
    const { clientState, resourceId } = req.body;
    const account = await Account.findOne({ webhookId: clientState });

    if (!account) {
      console.log("No account matches the provided clientState");

      return res.status(404).send("Account not found");
    }

    const changes = await fetchChangesFromGoogle(
      account.accessToken,
      resourceId,
    );

    await updateDatabaseWithChanges(account, changes);

    return res.status(200).send("Webhook processed successfully");
  } catch (error) {
    console.error("Error processing Google calendar webhook:", error);

    return res.status(500).send("Internal Server Error");
  }
};

exports.handleMicrosoftCalendarWebhook = async (req, res, next) => {
  console.log("Received Microsoft calendar webhook");

  try {
    const { clientState } = req.body;
    const account = await Account.findOne({ webhookId: clientState });

    if (!account) {
      console.log("No account matches the provided clientState");

      return res.status(404).send("Account not found");
    }

    const changes = await fetchChangesFromMicrosoft(
      account.accessToken,
      account.deltaLink,
    );

    await updateDatabaseWithChanges(changes);

    account.deltaLink = changes.deltaLink;

    await account.save();

    return res.status(200).send("Webhook processed successfully");
  } catch (error) {
    console.error("Error processing Microsoft calendar webhook:", error);

    return res.status(500).send("Internal Server Error");
  }
};
