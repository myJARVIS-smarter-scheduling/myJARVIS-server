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
  updateOutlookCalendarEvent,
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
    isAllDay: isAllDayEvent,
    eventId: tempEventId,
  };

  await Event.create(newEvent);

  let resultOfCalendarEvent;

  // TODO. 추후 provider에 따라 분기처리가 필요할 수 있습니다.
  if (provider === "google") {
    resultOfCalendarEvent = await createGoogleCalendarEvent(
      accountId,
      newEvent,
    );
  }

  if (provider === "microsoft") {
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
    const account = await Account.findById(accountId);
    const accountToken = account.accessToken;
    const updatedStartAt = new Date(startAt);
    const updatedEndAt = new Date(endAt);

    event.set({
      title,
      place,
      startAt: updatedStartAt,
      endAt: updatedEndAt,
      timezone,
      description,
      isAllDay: isAllDayEvent,
    });

    const updatedEventData = await event.save();

    let resultOfCalendarUpdate;

    if (provider === "google") {
      resultOfCalendarUpdate = await updateGoogleCalendarEvent(
        accountId,
        updatedEventData,
        // isAllDayEvent
      );
    }

    if (provider === "microsoft") {
      resultOfCalendarUpdate = await updateOutlookCalendarEvent(
        accountToken,
        accountId,
        updatedEventData,
      );
    }

    res.status(200).send({ result: "success", resultOfCalendarUpdate });
  } catch (error) {
    console.error(error);
  }
};

exports.deleteCalendarEvent = async (req, res, next) => {
  const eventIdOfMongoDB = req.params.eventId;
  const { accountId } = req.body;
  const account = await Account.findById(accountId);
  const { accessToken, provider } = account;

  try {
    const event = await Event.findById(eventIdOfMongoDB);

    if (provider === "google") {
      await deleteGoogleCalendarEvent(accountId, event);
      await Event.deleteOne({ _id: eventIdOfMongoDB });
    }

    if (provider === "microsoft") {
      await deleteOutlookCalendarEvent(accessToken, event);
      await Event.deleteOne({ _id: eventIdOfMongoDB });
    }

    res.status(200).send({ result: "success" });
  } catch (error) {
    console.error(error);
  }
};
