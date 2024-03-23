const express = require("express");

const router = express.Router();

const { verifyToken } = require("../middlewares/verifyToken");
const taskController = require("../controllers/task.controller");

router.get("/", verifyToken, taskController.fetchAsanaTasks);

router.post("/", verifyToken, taskController.transferAsanaTasks);

// TODO. 추후 작업할 엔드포인트 입니다.
// router.patch("/:taskId", verifyToken, taskController.updateTask);
// router.delete("/:taskId", verifyToken, taskController.deleteTask);
// router.post("/:taskId", verifyToken, taskController.createAsanaTask);
router.post(
  "/:taskId/archivement",
  verifyToken,
  taskController.completeAsanaTask,
);

module.exports = router;
