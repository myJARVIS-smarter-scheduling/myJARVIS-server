const express = require("express");

const router = express.Router();

router.get("/", function (req, res, next) {
  res.status(200).send({ success: true });
});

router.post("/", function (req, res, next) {});

router.put("/:eventId", function (req, res, next) {});

router.delete("/:eventId", function (req, res, next) {});

router.get("/conflicts", function (req, res, next) {});
