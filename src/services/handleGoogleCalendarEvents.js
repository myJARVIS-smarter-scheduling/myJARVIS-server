const { google } = require("googleapis");
const googleOAuth2Client = require("../config/googleOAuthClient");

const { Account, User } = require("../models/User");
const { Event } = require("../models/Event");

const {
  convertTimezoneWithDST,
  convertTimezoneWithoutDST,
} = require("./convertDateWithTimezone");
const { formatDate } = require("../utils/parsetDateformat");
const { TIMEZONE_LIST } = require("../constants/timezone");

exports.createGoogleCalendarEvent = async (accountId, newEventData) => {
  const account = await Account.findById(accountId);
  const user = await User.findById(account.userId);
  const userTimezone = user.timezone;
  const formattedUserTimezone = TIMEZONE_LIST.find(
    (timezone) =>
      timezone.value === userTimezone || timezone.alt === userTimezone,
  ).value;

  googleOAuth2Client.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken,
  });

  const calendar = google.calendar({ version: "v3", auth: googleOAuth2Client });

  const eventPlace = newEventData.place || "No place";
  const eventDescription = newEventData.description || "No description";
  const { startAt, endAt, timezone, isAllDay } = newEventData;
  const startAtDate = new Date(startAt);
  const endAtDate = new Date(endAt);

  const hasTimezoneSetting = formattedUserTimezone !== timezone;
  let convertedStartAt;
  let convertedEndAt;

  if (!isAllDay && hasTimezoneSetting) {
    const startAtWithSelectedTimezone = await convertTimezoneWithoutDST(
      startAt,
      account.provider,
      timezone,
    );
    const endAtWithSelectedTimezone = await convertTimezoneWithoutDST(
      endAt,
      account.provider,
      timezone,
    );

    const startAtWithUserTimezone = await convertTimezoneWithDST(
      startAtWithSelectedTimezone,
      account.provider,
      formattedUserTimezone,
    );
    const endAtWithUserTimezone = await convertTimezoneWithDST(
      endAtWithSelectedTimezone,
      account.provider,
      formattedUserTimezone,
    );

    convertedStartAt = startAtWithUserTimezone;
    convertedEndAt = endAtWithUserTimezone;
  }

  if (isAllDay) {
    startAtDate.setHours(0, 0, 0, 0);
    endAtDate.setDate(endAtDate.getDate() + 1);
    endAtDate.setHours(0, 0, 0, 0);
  }

  const eventStart = isAllDay
    ? { date: formatDate(startAtDate) }
    : {
        dateTime: hasTimezoneSetting
          ? convertedStartAt.toISOString()
          : startAtDate.toISOString(),
        timeZone: newEventData.timezone.trim(),
      };
  const eventEnd = isAllDay
    ? { date: formatDate(endAtDate) }
    : {
        dateTime: hasTimezoneSetting
          ? convertedEndAt.toISOString()
          : endAtDate.toISOString(),
        timeZone: newEventData.timezone.trim(),
      };

  const newEvent = {
    summary: newEventData.title,
    location: eventPlace,
    description: eventDescription,
    start: eventStart,
    end: eventEnd,
  };

  try {
    const response = await calendar.events.insert({
      calendarId: "primary",
      resource: newEvent,
    });

    console.log("Google Calendar event created successfully:", response.data);

    await Event.findOneAndUpdate(
      { eventId: newEventData.eventId },
      {
        $set: {
          eventId: response.data.id,
          timezone: eventStart.timeZone,
          startAt: eventStart.dateTime || eventStart.date,
          endAt: eventEnd.dateTime || eventEnd.date,
        },
      },
      { new: true },
    );

    return response.data;
  } catch (error) {
    console.error("Create connected calendar error:", error);

    throw error;
  }
};

exports.updateGoogleCalendarEvent = async (
  accountId,
  updatedEventData,
  eventId,
) => {
  const account = await Account.findById(accountId);
  const user = await User.findById(account.userId);
  const userTimezone = user.timezone;
  const formattedUserTimezone = TIMEZONE_LIST.find(
    (timezone) =>
      timezone.value === userTimezone || timezone.alt === userTimezone,
  ).value;

  googleOAuth2Client.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken,
  });

  const calendar = google.calendar({ version: "v3", auth: googleOAuth2Client });

  const { startAt, endAt, timezone, isAllDay } = updatedEventData;
  const startAtDate = new Date(startAt);
  const endAtDate = new Date(endAt);

  const hasTimezoneSetting = formattedUserTimezone !== timezone;
  let convertedStartAt;
  let convertedEndAt;

  if (isAllDay) {
    startAtDate.setHours(0, 0, 0, 0);
    endAtDate.setDate(endAtDate.getDate() + 1);
    endAtDate.setHours(0, 0, 0, 0);
  }

  if (!isAllDay && hasTimezoneSetting) {
    const isCalendarEvent = false;
    const startAtWithSelectedTimezone = await convertTimezoneWithoutDST(
      startAt,
      account.provider,
      timezone,
      isCalendarEvent,
    );
    const endAtWithSelectedTimezone = await convertTimezoneWithoutDST(
      endAt,
      account.provider,
      timezone,
      isCalendarEvent,
    );

    const startAtWithUserTimezone = await convertTimezoneWithDST(
      startAtWithSelectedTimezone,
      account.provider,
      formattedUserTimezone,
      isCalendarEvent,
    );
    const endAtWithUserTimezone = await convertTimezoneWithDST(
      endAtWithSelectedTimezone,
      account.provider,
      formattedUserTimezone,
      isCalendarEvent,
    );

    convertedStartAt = startAtWithUserTimezone;
    convertedEndAt = endAtWithUserTimezone;
  }

  const eventStart = isAllDay
    ? { date: formatDate(startAtDate) }
    : {
        dateTime: hasTimezoneSetting
          ? convertedStartAt.toISOString()
          : startAtDate.toISOString(),
        timeZone: updatedEventData.timezone.trim(),
      };
  const eventEnd = isAllDay
    ? { date: formatDate(endAtDate) }
    : {
        dateTime: hasTimezoneSetting
          ? convertedEndAt.toISOString()
          : endAtDate.toISOString(),
        timeZone: updatedEventData.timezone.trim(),
      };

  const updatedEvent = {
    summary: updatedEventData.title,
    location: updatedEventData.place,
    description: updatedEventData.description,
    start: eventStart,
    end: eventEnd,
  };

  try {
    const response = await calendar.events.update({
      calendarId: "primary",
      eventId,
      resource: updatedEvent,
    });

    await Event.findOneAndUpdate(
      { eventId },
      {
        $set: {
          timezone: eventStart.timeZone || updatedEventData.timezone.trim(),
          startAt: eventStart.dateTime || eventStart.date,
          endAt: eventEnd.dateTime || eventEnd.date,
        },
      },
      { new: true },
    );

    console.log("Google Calendar event updated successfully:", response.data);

    return response.data;
  } catch (error) {
    console.error("Update connected calendar error:", error);

    throw error;
  }
};

exports.deleteGoogleCalendarEvent = async (accountId, event) => {
  const account = await Account.findById(accountId);

  googleOAuth2Client.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken,
  });

  const calendar = google.calendar({ version: "v3", auth: googleOAuth2Client });
  const originalEventKey = event.eventId;

  try {
    const response = calendar.events.delete({
      calendarId: "primary",
      eventId: originalEventKey,
    });

    console.log("Google Calendar event deleted successfully:", response.data);

    return response.data;
  } catch (error) {
    console.error("Delete connected calendar error:", error);

    throw error;
  }
};
