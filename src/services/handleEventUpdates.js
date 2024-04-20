const {
  convertTimezoneWithDST,
  convertTimezoneWithoutDST,
} = require("./convertDateWithTimezone");
const { User } = require("../models/User");
const { Event } = require("../models/Event");
const { TIMEZONE_LIST } = require("../constants/timezone");

exports.createGoogleWebhookEvent = async (account, newEventData) => {
  const accountId = account._id;
  const newEvent = {
    accountId,
    title: newEventData.title,
    place: newEventData.place,
    timezone: newEventData.timezone,
    attendees: newEventData.attendees,
    description: newEventData.description,
    startAt: newEventData.startAt,
    endAt: newEventData.endAt,
    provider: account.provider,
    isAllDay: newEventData.isAllDayEvent,
    eventId: newEventData.eventId,
  };

  await Event.create(newEvent);
};

exports.updateGoogleWebhookEvent = async (updatedEventData) => {
  const updatedEvent = {
    title: updatedEventData.title,
    place: updatedEventData.place,
    timezone: updatedEventData.timezone,
    attendees: updatedEventData.attendees,
    description: updatedEventData.description,
    startAt: updatedEventData.startAt,
    endAt: updatedEventData.endAt,
    isAllDay: updatedEventData.isAllDayEvent,
  };

  await Event.findOneAndUpdate(
    { eventId: updatedEventData.eventId },
    {
      $set: updatedEvent,
    },
  );
};

exports.deleteGoogleWebhookEvent = async (deletedEventData) => {
  await Event.deleteOne({ eventId: deletedEventData.eventId });
};

exports.createMicrosoftWebhookEvent = async (account, newEventData) => {
  const user = await User.findById(account.userId);
  const isCalendarEvent = false;
  const { provider } = account;
  const { isAllDay } = newEventData;
  const formattedUserTimezone = TIMEZONE_LIST.find(
    (timezone) =>
      timezone.alt === user.timezone || timezone.value === user.timezone,
  ).value;
  const formattedEventTimezone = TIMEZONE_LIST.find(
    (timezone) =>
      timezone.alt === newEventData.timezone ||
      timezone.value === newEventData.timezone,
  ).value;
  const startAtDate = new Date(newEventData.startAt);
  const endAtDate = new Date(newEventData.endAt);
  const hasTimezoneSetting = formattedUserTimezone !== formattedEventTimezone;
  let convertedStartAtWithUserTimezone;
  let convertedEndAtWithUserTimezone;

  if (isAllDay) {
    startAtDate.setHours(0, 0, 0, 0);
    endAtDate.setDate(endAtDate.getDate() + 1);
    endAtDate.setHours(0, 0, 0, 0);
  }

  if (!isAllDay && hasTimezoneSetting) {
    const startAtWithSelectedTimezone = await convertTimezoneWithoutDST(
      newEventData.startAt,
      provider,
      formattedEventTimezone,
      isCalendarEvent,
    );
    const endAtWithSelectedTimezone = await convertTimezoneWithoutDST(
      newEventData.endAt,
      provider,
      formattedEventTimezone,
      isCalendarEvent,
    );

    convertedStartAtWithUserTimezone = await convertTimezoneWithDST(
      startAtWithSelectedTimezone,
      provider,
      formattedUserTimezone,
      isCalendarEvent,
    );
    convertedEndAtWithUserTimezone = await convertTimezoneWithDST(
      endAtWithSelectedTimezone,
      provider,
      formattedUserTimezone,
      isCalendarEvent,
    );
  }

  await Event.create({
    accountId: account._id,
    title: newEventData.title,
    place: newEventData.place,
    timezone: hasTimezoneSetting
      ? formattedEventTimezone
      : formattedUserTimezone,
    description: newEventData.description,
    attendees: newEventData.attendees,
    startAt: hasTimezoneSetting
      ? convertedStartAtWithUserTimezone.toISOString()
      : startAtDate.toISOString(),
    endAt: hasTimezoneSetting
      ? convertedEndAtWithUserTimezone.toISOString()
      : endAtDate.toISOString(),
    isAllDay: newEventData.isAllDayEvent,
    eventId: newEventData.eventId,
  });
};

exports.updateMicrosoftWebhookEvent = async (account, updatedEventData) => {
  const user = await User.findById(account.userId);
  const { provider } = account;
  const { isAllDay } = updatedEventData;
  const isCalendarEvent = false;
  const formattedUserTimezone = TIMEZONE_LIST.find(
    (timezone) =>
      timezone.alt === user.timezone || timezone.value === user.timezone,
  ).value;
  const formattedEventTimezone = TIMEZONE_LIST.find(
    (timezone) =>
      timezone.alt === updatedEventData.timezone ||
      timezone.value === updatedEventData.timezone,
  ).value;
  const startAtDate = new Date(updatedEventData.startAt);
  const endAtDate = new Date(updatedEventData.endAt);
  const hasTimezoneSetting = formattedUserTimezone !== formattedEventTimezone;
  let convertedStartAtWithUserTimezone;
  let convertedEndAtWithUserTimezone;

  if (isAllDay) {
    updatedEventData.startAt.setHours(0, 0, 0, 0);
    updatedEventData.endAt.setDate(endAtDate.getDate() + 1);
    updatedEventData.endAt.setHours(0, 0, 0, 0);
  }

  if (!isAllDay && hasTimezoneSetting) {
    const startAtWithSelectedTimezone = await convertTimezoneWithoutDST(
      updatedEventData.startAt,
      provider,
      formattedEventTimezone,
      isCalendarEvent,
    );
    const endAtWithSelectedTimezone = await convertTimezoneWithoutDST(
      updatedEventData.endAt,
      provider,
      formattedEventTimezone,
      isCalendarEvent,
    );

    convertedStartAtWithUserTimezone = await convertTimezoneWithDST(
      startAtWithSelectedTimezone,
      provider,
      formattedUserTimezone,
      isCalendarEvent,
    );
    convertedEndAtWithUserTimezone = await convertTimezoneWithDST(
      endAtWithSelectedTimezone,
      provider,
      formattedUserTimezone,
      isCalendarEvent,
    );
  }

  const updatedEvent = {
    title: updatedEventData.title,
    place: updatedEventData.place,
    description: updatedEventData.description,
    timezone: hasTimezoneSetting
      ? formattedEventTimezone
      : formattedUserTimezone,
    startAt: hasTimezoneSetting
      ? convertedStartAtWithUserTimezone.toISOString()
      : startAtDate.toISOString(),
    endAt: hasTimezoneSetting
      ? convertedEndAtWithUserTimezone.toISOString()
      : endAtDate.toISOString(),
    isAllDay,
  };

  await Event.findOneAndUpdate(
    { eventId: updatedEventData.eventId },
    {
      $set: updatedEvent,
    },
  );
};

exports.deleteMicrosoftWebhookEvent = async (deletedEventData) => {
  await Event.deleteOne({ eventId: deletedEventData.eventId });
};
