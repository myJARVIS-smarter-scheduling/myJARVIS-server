const mongoose = require("mongoose");

const { Schema } = mongoose;

const asanaWorksSpaceSchema = new mongoose.Schema({
  asanaId: { type: Schema.Types.ObjectId, ref: "AsanaUser", required: true },
  name: { type: String, required: true },
  workspaceKey: { type: String, required: true, unique: true },
  type: { type: String, required: true },
});

const asanaUserSchema = new mongoose.Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  asanaKey: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  workspaces: [asanaWorksSpaceSchema],
  accessToken: { type: String, required: true },
  refreshToken: { type: String, required: true },
  tokenExpiredAt: { type: Date, required: true },
});

exports.AsanaUser = mongoose.model("AsanaUser", asanaUserSchema);
exports.AsanaWorkspace = mongoose.model(
  "AsanaWorkspace",
  asanaWorksSpaceSchema,
);
