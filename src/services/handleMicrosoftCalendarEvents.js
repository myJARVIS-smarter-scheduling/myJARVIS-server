const axios = require("axios");
const {
  convertTimezoneWithDST,
  convertTimezoneWithoutDST,
} = require("./convertDateWithTimezone");
const { convertUtcDate } = require("../utils/parsetDateformat");
const { Account, User } = require("../models/User");
const { Event } = require("../models/Event");
const { TIMEZONE_LIST } = require("../constants/timezone");

exports.createOutlookCalendarEvent = async (
  accountId,
  accessToken,
  newEventData,
) => {
  const account = await Account.findById(accountId);
  const user = await User.findById(account.userId);
  const userTimezone = user.timezone;
  const formattedUserTimezone = TIMEZONE_LIST.find(
    (timezone) =>
      timezone.alt === userTimezone || timezone.value === userTimezone,
  ).value;
  const formattedEventTimezone = TIMEZONE_LIST.find(
    (timezone) =>
      timezone.alt === newEventData.timezone ||
      timezone.value === newEventData.timezone,
  ).value;

  const { startAt, endAt, isAllDay, provider } = newEventData;
  const eventPlace = newEventData.place || "No place";
  const eventDescription = newEventData.description || "No description";
  const startAtDate = new Date(startAt);
  const endAtDate = new Date(endAt);

  const hasTimezoneSetting = formattedUserTimezone !== formattedEventTimezone;
  let convertedStartAt;
  let convertedEndAt;
  let convertedStartAtWithUserTimezone;
  let convertedEndAtWithUserTimezone;

  if (isAllDay) {
    startAtDate.setHours(0, 0, 0, 0);
    endAtDate.setDate(endAtDate.getDate() + 1);
    endAtDate.setHours(0, 0, 0, 0);
  }

  if (!isAllDay && hasTimezoneSetting) {
    const isCalendarEvent = false;
    const parsedStartTime = convertUtcDate(startAt);
    const parsedEndTime = convertUtcDate(endAt);
    const formattedStartTime = new Date(parsedStartTime)
      .toISOString()
      .split(".")[0];
    const formattedEndTime = new Date(parsedEndTime)
      .toISOString()
      .split(".")[0];

    convertedStartAt = formattedStartTime;
    convertedEndAt = formattedEndTime;

    const startAtWithSelectedTimezone = await convertTimezoneWithoutDST(
      startAt,
      provider,
      formattedEventTimezone,
      isCalendarEvent,
    );
    const endAtWithSelectedTimezone = await convertTimezoneWithoutDST(
      endAt,
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

  const newEvent = {
    subject: newEventData.title,
    body: {
      contentType: "html",
      content: eventDescription,
    },
    start: {
      dateTime: hasTimezoneSetting
        ? convertedStartAt
        : startAtDate.toLocaleString(),
      timeZone: hasTimezoneSetting
        ? formattedEventTimezone
        : formattedUserTimezone,
    },
    end: {
      dateTime: hasTimezoneSetting
        ? convertedEndAt
        : endAtDate.toLocaleString(),
      timeZone: hasTimezoneSetting
        ? formattedEventTimezone
        : formattedUserTimezone,
    },
    location: { displayName: eventPlace },
    isAllDay,
    transactionId: newEventData.eventId,
  };

  try {
    const response = await axios.post(
      "https://graph.microsoft.com/v1.0/me/events",
      newEvent,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    console.log("Outlook Calendar event created successfully:", response.data);

    await Event.findOneAndUpdate(
      { eventId: newEventData.eventId },
      {
        $set: {
          eventId: response.data.id,
          timezone: hasTimezoneSetting
            ? formattedEventTimezone
            : formattedUserTimezone,
          startAt: hasTimezoneSetting
            ? convertedStartAtWithUserTimezone.toISOString()
            : startAtDate.toISOString(),
          endAt: hasTimezoneSetting
            ? convertedEndAtWithUserTimezone.toISOString()
            : endAtDate.toISOString(),
          isAllDay: response.data.isAllDay,
        },
      },
      { new: true },
    );

    return response.data;
  } catch (error) {
    console.error("Error creating event in Microsoft Calendar:", error);

    throw error;
  }
};

exports.updateOutlookCalendarEvent = async (
  accessToken,
  accountId,
  updatedEventData,
  eventId,
) => {
  const account = await Account.findById(accountId);
  const user = await User.findById(account.userId);
  const userTimezone = user.timezone;
  const { startAt, endAt, timezone, isAllDay, provider } = updatedEventData;

  const startAtDate = new Date(startAt);
  const endAtDate = new Date(endAt);
  let convertedStartAt;
  let convertedEndAt;
  let convertedStartAtWithUserTimezone;
  let convertedEndAtWithUserTimezone;

  const formattedUserTimezone = TIMEZONE_LIST.find(
    (timezoneData) =>
      timezoneData.value === userTimezone || timezoneData.alt === userTimezone,
  ).value;
  const hasTimezoneSetting = formattedUserTimezone !== timezone;

  if (isAllDay) {
    startAt.setHours(0, 0, 0, 0);
    endAt.setDate(endAtDate.getDate() + 1);
    endAt.setHours(0, 0, 0, 0);
  }

  if (!isAllDay && hasTimezoneSetting) {
    const isCalendarEvent = false;
    const parsedStartTime = convertUtcDate(startAt);
    const parsedEndTime = convertUtcDate(endAt);
    const formattedStartTime = new Date(parsedStartTime)
      .toISOString()
      .split(".")[0];
    const formattedEndTime = new Date(parsedEndTime)
      .toISOString()
      .split(".")[0];

    convertedStartAt = formattedStartTime;
    convertedEndAt = formattedEndTime;

    const startAtWithSelectedTimezone = await convertTimezoneWithoutDST(
      startAt,
      provider,
      timezone,
      isCalendarEvent,
    );
    const endAtWithSelectedTimezone = await convertTimezoneWithoutDST(
      endAt,
      provider,
      timezone,
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

  const updatedTimezone = hasTimezoneSetting ? timezone : formattedUserTimezone;
  const eventStart = {
    dateTime: hasTimezoneSetting
      ? convertedStartAt
      : startAtDate.toLocaleString(),
    timeZone: updatedTimezone,
  };
  const eventEnd = {
    dateTime: hasTimezoneSetting ? convertedEndAt : endAtDate.toLocaleString(),
    timeZone: updatedTimezone,
  };

  const updatedEvent = {
    subject: updatedEventData.title,
    body: {
      contentType: "HTML",
      content: updatedEventData.description,
    },
    start: eventStart,
    end: eventEnd,
    location: {
      displayName: updatedEventData.place,
    },
    isAllDay: updatedEventData.isAllDay,
  };

  try {
    const response = await axios.patch(
      `https://graph.microsoft.com/v1.0/me/events/${eventId}`,
      updatedEvent,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    await Event.findOneAndUpdate(
      { eventId },
      {
        $set: {
          timezone: updatedTimezone,
          startAt: hasTimezoneSetting
            ? convertedStartAtWithUserTimezone.toISOString()
            : startAtDate.toISOString(),
          endAt: hasTimezoneSetting
            ? convertedEndAtWithUserTimezone.toISOString()
            : endAtDate.toISOString(),
          isAllDay: response.data.isAllDay,
        },
      },
      { new: true },
    );

    console.log("Outlook Calendar event updated successfully:", response.data);

    return response.data;
  } catch (error) {
    console.error("Error updating event in Microsoft Calendar:", error);

    throw error;
  }
};

exports.deleteOutlookCalendarEvent = async (accessToken, event) => {
  const originalEventKey = event.eventId;

  try {
    const response = await axios.delete(
      `https://graph.microsoft.com/v1.0/me/events/${originalEventKey}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    console.log("Outlook Calendar event deleted successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error deleting event in Microsoft Calendar:", error);

    throw error;
  }
};
