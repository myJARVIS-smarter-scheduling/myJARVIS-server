const express = require("express");

const router = express.Router();

const authController = require("../controllers/auth.controller");

router.post("/google", authController.googleAuthHandler);

// TODO: 배포 이후 HTTPS 사용시에는 해당 주석을 활성화합니다.
// router.post("/outlook", authController.outlookAuthHandler);

router.get("/outlook/proxy", authController.outlookAuthHandler);

module.exports = router;
