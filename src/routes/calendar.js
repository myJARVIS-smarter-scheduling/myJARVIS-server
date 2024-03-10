const express = require("express");

const router = express.Router();

const calendarController = require("../controllers/calendar.controller");

router.get("/google", calendarController.googleCalendarHandler);
router.get("/outlook", calendarController.outlookCalendarHandler);

module.exports = router;
