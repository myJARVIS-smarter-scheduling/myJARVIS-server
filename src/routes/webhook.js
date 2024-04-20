const express = require("express");

const router = express.Router();

const webhookController = require("../controllers/webhook.controller");

router.post(
  "/webhook/google/calendar",
  webhookController.handleGoogleCalendarWebhook,
);

router.post(
  "/webhook/microsoft/calendar",
  webhookController.handleMicrosoftCalendarWebhook,
);

module.exports = router;
