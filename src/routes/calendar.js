const express = require("express");

const router = express.Router();

const { verifyToken } = require("../middlewares/verifyToken");
const calendarController = require("../controllers/calendar.controller");

router.get("/google", calendarController.saveGoogleUserAndCalendar);

router.post("/events", verifyToken, calendarController.transferCalendarEvents);

module.exports = router;
