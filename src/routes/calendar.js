const express = require("express");

const router = express.Router();

const calendarController = require("../controllers/calendar.controller");

router.get("/google", calendarController.saveGoogleUserAndCalendar);

router.post("/outlook", calendarController.saveOutlookUserAndCalendar);
router.post("/events", calendarController.transferCalendarEvents);

module.exports = router;
