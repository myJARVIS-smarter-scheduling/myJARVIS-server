const express = require("express");

const router = express.Router();

const { verifyToken } = require("../middlewares/verifyToken");
const taskController = require("../controllers/task.controller");

router.get("/", verifyToken, taskController.fetchAsanaTasks);

router.post("/", verifyToken, taskController.transferAsanaTasks);

router.post(
  "/:taskId/archivement",
  verifyToken,
  taskController.completeAsanaTask,
);

module.exports = router;
