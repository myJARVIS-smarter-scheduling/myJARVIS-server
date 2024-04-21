const {
  createGoogleWebhookEvent,
  updateGoogleWebhookEvent,
  deleteGoogleWebhookEvent,
  createMicrosoftWebhookEvent,
  updateMicrosoftWebhookEvent,
  deleteMicrosoftWebhookEvent,
} = require("./handleEventUpdates");

const updateDatabaseWithChanges = async (account, changes) => {
  console.log(
    `Processing ${account.provider} calendar webhook database updates`,
  );
  const { provider } = account;

  changes.forEach((change) => {
    switch (change.type) {
      case "created":
        if (provider === "google") {
          createGoogleWebhookEvent(account, change);
        } else {
          createMicrosoftWebhookEvent(account, change);
        }
        break;

      case "updated":
        if (provider === "google") {
          updateGoogleWebhookEvent(change);
        } else {
          updateMicrosoftWebhookEvent(account, change);
        }
        break;

      case "deleted":
        if (provider === "google") {
          deleteGoogleWebhookEvent(change);
        } else {
          deleteMicrosoftWebhookEvent(change);
        }
        break;

      default:
        break;
    }
  });
};

module.exports = updateDatabaseWithChanges;
