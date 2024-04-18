const express = require("express");

const router = express.Router();

const authController = require("../controllers/auth.controller");
const userController = require("../controllers/user.controller");

router.get("/google", authController.googleAuthHandler);
router.get("/asana", authController.asanaAuthHandler);
router.get("/asana/users", userController.getAsanaUser);

router.post("/logout", authController.googleLogout);

module.exports = router;
