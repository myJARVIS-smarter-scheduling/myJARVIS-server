const index = require("../routes/index");
const auth = require("../routes/auth");
const calendar = require("../routes/calendar");

function connectRouters(app) {
  app.use("/", index);
  app.use("/auth", auth);
  app.use("/calendar", calendar);
}

module.exports = connectRouters;
