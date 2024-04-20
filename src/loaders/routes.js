const index = require("../routes/index");
const auth = require("../routes/auth");
const calendar = require("../routes/calendar");
const events = require("../routes/events");
const tasks = require("../routes/tasks");
const webhook = require("../routes/webhook");

function connectRouters(app) {
  app.use("/", index);
  app.use("/auth", auth);
  app.use("/calendar", calendar);
  app.use("/events", events);
  app.use("/tasks", tasks);
  app.use("/webhook", webhook);
}

module.exports = connectRouters;
