const crypto = require("crypto");
const { Event } = require("../models/Event");
const { Account, User } = require("../models/User");
const {
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
} = require("../services/handleGoogleCalendarEvents");

exports.createCalendarEvent = async (req, res, next) => {
  const {
    accountId,
    title,
    place,
    startAt,
    endAt,
    timezone,
    description,
    isAllDayEvent,
  } = req.body.newEventData;

  const account = await Account.findById(accountId);
  const { provider } = account;
  const tempEventId = crypto.randomUUID();

  const newEventData = {
    accountId: account._id,
    title,
    place,
    timezone,
    description,
    startAt,
    endAt,
    provider,
    eventId: tempEventId,
  };

  await Event.create(newEventData);

  // TODO. 추후 provider에 따라 분기처리가 필요할 수 있습니다.
  const resultOfCalendarEvent = await createGoogleCalendarEvent(
    accountId,
    newEventData,
    isAllDayEvent,
  );

  res.status(200).send({ result: "success", newEvent: resultOfCalendarEvent });
};

exports.updateCalendarEvent = async (req, res, next) => {
  const {
    dataId,
    title,
    place,
    startAt,
    endAt,
    timezone,
    description,
    provider,
    isAllDayEvent,
  } = req.body.updatedEventData;

  const eventIdOfMongoDB = dataId;

  try {
    const event = await Event.findById(eventIdOfMongoDB);
    const accountId = event.accountId.toString();

    event.set({
      title,
      place,
      startAt,
      endAt,
      timezone,
      description,
    });

    // TODO. 추후 provider에 따라 분기처리가 필요할 수 있습니다.
    const updatedEventData = await event.save();
    const updatedEvent = await updateGoogleCalendarEvent(
      accountId,
      updatedEventData,
      isAllDayEvent,
    );

    res.status(200).send({ result: "success", updatedEvent });
  } catch (error) {
    console.error(error);
  }
};

exports.deleteCalendarEvent = async (req, res, next) => {
  const eventIdOfMongoDB = req.params.eventId;
  const { accountId } = req.body;

  try {
    const event = await Event.findById(eventIdOfMongoDB);

    // TODO. 추후 provider에 따라 분기처리가 필요할 수 있습니다.
    await deleteGoogleCalendarEvent(accountId, event);
    await Event.deleteOne({ _id: eventIdOfMongoDB });

    console.log("연결된 구글캘린더 이벤트 삭제 완료");

    res.status(200).send({ result: "success" });
  } catch (error) {
    console.error(error);
  }
};
