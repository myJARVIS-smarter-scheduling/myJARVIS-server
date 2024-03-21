const express = require("express");

const router = express.Router();

const { verifyToken } = require("../middlewares/verifyToken");
const eventsController = require("../controllers/events.controller");

router.post("/", verifyToken, eventsController.createCalendarEvent);

router.patch("/:eventId", verifyToken, eventsController.updateCalendarEvent);

router.delete("/:eventId", verifyToken, eventsController.deleteCalendarEvent);

module.exports = router;
