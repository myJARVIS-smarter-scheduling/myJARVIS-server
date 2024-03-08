const index = require("../routes/index");
const auth = require("../routes/auth");

function connectRouters(app) {
  app.use("/", index);
  app.use("/auth", auth);
}

module.exports = connectRouters;
