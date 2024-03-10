const mongoose = require("mongoose");

const { Schema } = mongoose;

const accountSchema = new mongoose.Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  provider: { type: String, required: true },
  email: { type: String, required: true },
  accessToken: { type: String, required: true },
  refreshToken: { type: String },
  tokenExpiredAt: { type: Date, required: true },
});

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  timezone: { type: String, required: true, default: "Korea Standard Time" },
  language: { type: String, required: true, default: "en" },
  accountList: [accountSchema],
});

exports.User = mongoose.model("User", userSchema);
exports.Account = mongoose.model("Account", accountSchema);
