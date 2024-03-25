const mongoose = require("mongoose");

const { Schema } = mongoose;

const eventSchema = new mongoose.Schema({
  accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true },
  title: { type: String, required: true },
  place: { type: String, default: "No place" },
  timezone: { type: String },
  attendees: { type: Array, required: true, default: [] },
  description: { type: String, default: "No description" },
  startAt: { type: Date, required: true },
  isAllDay: { type: Boolean }, // 마이크로소프트용으로 구글과는 달리 별도로 전달읋 해줍니다.
  endAt: { type: Date, required: true },
  provider: { type: String, required: true },
  eventId: { type: String, required: true, unique: true },
});

exports.Event = mongoose.model("Event", eventSchema);
