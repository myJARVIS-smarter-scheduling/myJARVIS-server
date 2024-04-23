const express = require("express");

const router = express.Router();

const webhookController = require("../controllers/webhook.controller");

router.post("/google/calendar", webhookController.handleGoogleCalendarWebhook);

module.exports = router;
