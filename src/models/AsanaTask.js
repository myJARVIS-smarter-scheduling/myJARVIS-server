const mongoose = require("mongoose");

const { Schema } = mongoose;

const asanataskSchema = new mongoose.Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  asanaId: { type: Schema.Types.ObjectId, ref: "AsanaUser", required: true },
  workspaceId: {
    type: Schema.Types.ObjectId,
    ref: "AsanaWorkspace",
    required: true,
  },
  taskKey: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  projects: { type: Array, required: true },
  dependencies: { type: Array },
  dependents: { type: Array },
  link: { type: String, required: true },
  startAt: { type: Date, default: null },
  dueAt: { type: Date, default: null },
  startOn: { type: Date, default: null },
  dueOn: { type: Date, default: null },
  customFields: { type: Array },
});

exports.AsanaTask = mongoose.model("AsanaTask", asanataskSchema);
