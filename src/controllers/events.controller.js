const crypto = require("crypto");
const { Event } = require("../models/Event");
const { Account, User } = require("../models/User");
const {
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
} = require("../services/handleGoogleCalendarEvents");
const {
  createOutlookCalendarEvent,
  // updateOutlookCalendarEvent, TODO. 마이크로소프트 업데이트 이벤트 서비스를 추가합니다.
  deleteOutlookCalendarEvent,
} = require("../services/handleMicrosoftCalendarEvents");

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
  const accountToken = account.accessToken;
  const { provider } = account;
  const tempEventId = crypto.randomUUID();

  const newEvent = {
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

  console.log("newEvent:", newEvent);

  await Event.create(newEvent);

  let resultOfCalendarEvent;

  // TODO. 추후 provider에 따라 분기처리가 필요할 수 있습니다.
  if (provider === "google") {
    resultOfCalendarEvent = await createGoogleCalendarEvent(
      accountId,
      newEvent,
      isAllDayEvent,
    );
  } else if (provider === "microsoft") {
    resultOfCalendarEvent = await createOutlookCalendarEvent(
      accountId,
      accountToken,
      newEvent,
    );
  }

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
    isAllDayEvent,
    provider,
  } = req.body.updatedEventData;

  const eventIdOfMongoDB = dataId;

  try {
    const event = await Event.findById(eventIdOfMongoDB);
    const accountId = event.accountId.toString();

    event.set({
      title,
      place,
      timezone,
      description,
    });

    const updatedEventData = await event.save();

    let resultOfCalendarUpdate;

    if (provider === "google") {
      resultOfCalendarUpdate = await updateGoogleCalendarEvent(
        accountId,
        updatedEventData,
        isAllDayEvent,
      );
    }

    // TODO: 추후 기능 구현을 위한 분기처리입니다.
    /*  if (provider === "microsoft") {
      resultOfCalendarUpdate = await updateOutlookCalendarEvent(
        accountId,
        accountToken,
        newEvent
      );
    } */

    res.status(200).send({ result: "success", resultOfCalendarUpdate });
  } catch (error) {
    console.error(error);
  }
};

exports.deleteCalendarEvent = async (req, res, next) => {
  const eventIdOfMongoDB = req.params.eventId;
  const { accountId } = req.body;
  const account = await Account.findById(accountId);
  const { provider } = account;

  try {
    const event = await Event.findById(eventIdOfMongoDB);

    if (provider === "google") {
      await deleteGoogleCalendarEvent(accountId, event);
      await Event.deleteOne({ _id: eventIdOfMongoDB });
    }

    // TODO: 추후 기능 구현을 위한 분기처리입니다.
    /*  if (provider === "microsoft") {
      await deleteOutlookCalendarEvent(accountId, accessToken, event);
      await Event.deleteOne({ _id: eventIdOfMongoDB });
    } */

    res.status(200).send({ result: "success" });
  } catch (error) {
    console.error(error);
  }
};
