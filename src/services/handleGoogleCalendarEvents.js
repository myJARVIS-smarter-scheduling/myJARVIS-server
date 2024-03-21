const { google } = require("googleapis");
const e = require("express");
const googleOAuth2Client = require("../config/googleOAuthClient");

const { Account, User } = require("../models/User");
const { Event } = require("../models/Event");

const {
  convertTimezoneWithDST,
  convertTimezoneWithoutDST,
} = require("./convertDateWithTimezone");
const { formatDate } = require("../utils/parsetDateformat");

exports.createGoogleCalendarEvent = async (
  accountId,
  newEventData,
  isAllDayEvent,
) => {
  const account = await Account.findById(accountId);
  const user = await User.findById(account.userId);
  const userTimezone = user.timezone;

  googleOAuth2Client.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken,
  });

  const calendar = google.calendar({ version: "v3", auth: googleOAuth2Client });

  const eventPlace = newEventData.place || "No place";
  const eventDescription = newEventData.description || "No description";
  const { startAt, endAt, timezone } = newEventData;
  const startAtDate = new Date(startAt);
  const endAtDate = new Date(endAt);

  const hasTimezoneSetting = user.timezone !== timezone;
  let convertedStartAt;
  let convertedEndAt;

  // TODO. 업데이트와 중복되는 로직이 많으므로 모듈화를 고려합니다.
  if (!isAllDayEvent && hasTimezoneSetting) {
    const startAtWithSelectedTimezone = await convertTimezoneWithoutDST(
      startAt,
      timezone,
    );
    const endAtWithSelectedTimezone = await convertTimezoneWithoutDST(
      endAt,
      timezone,
    );

    const startAtWithUserTimezone = await convertTimezoneWithDST(
      startAtWithSelectedTimezone,
      userTimezone,
    );
    const endAtWithUserTimezone = await convertTimezoneWithDST(
      endAtWithSelectedTimezone,
      userTimezone,
    );

    convertedStartAt = startAtWithUserTimezone;
    convertedEndAt = endAtWithUserTimezone;
  }

  const eventStart = isAllDayEvent
    ? { date: formatDate(newEventData.startAt) }
    : {
        dateTime: hasTimezoneSetting
          ? convertedStartAt.toISOString()
          : startAtDate.toISOString(),
        timeZone: newEventData.timezone.trim(),
      };
  const eventEnd = isAllDayEvent
    ? { date: formatDate(newEventData.endAt) }
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

    // TODO. 데이터베이스 업데이트 로직은 이벤트 컨트롤러로의 분리를 고려합니다.
    await Event.findOneAndUpdate(
      { eventId: newEventData.eventId },
      {
        $set: {
          eventId: response.data.id,
          timeZone: eventStart.timeZone,
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
  isAllDayEvent,
) => {
  const account = await Account.findById(accountId);
  const user = await User.findById(account.userId);
  const userTimezone = user.timezone;

  googleOAuth2Client.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken,
  });

  const calendar = google.calendar({ version: "v3", auth: googleOAuth2Client });

  const originalEventKey = updatedEventData.eventId;
  const { startAt, endAt, timezone } = updatedEventData;
  const startAtDate = new Date(startAt);
  const endAtDate = new Date(endAt);

  const hasTimezoneSetting = user.timezone !== timezone;
  let convertedStartAt;
  let convertedEndAt;

  if (!isAllDayEvent && hasTimezoneSetting) {
    const startAtWithSelectedTimezone = await convertTimezoneWithoutDST(
      startAt,
      timezone,
    );
    const endAtWithSelectedTimezone = await convertTimezoneWithoutDST(
      endAt,
      timezone,
    );

    const startAtWithUserTimezone = await convertTimezoneWithDST(
      startAtWithSelectedTimezone,
      userTimezone,
    );
    const endAtWithUserTimezone = await convertTimezoneWithDST(
      endAtWithSelectedTimezone,
      userTimezone,
    );

    convertedStartAt = startAtWithUserTimezone;
    convertedEndAt = endAtWithUserTimezone;
  }

  const eventStart = isAllDayEvent
    ? { date: updatedEventData.startAt.substring(0, 10) }
    : {
        dateTime: hasTimezoneSetting
          ? convertedStartAt.toISOString()
          : startAtDate.toISOString(),
        timeZone: updatedEventData.timezone.trim(),
      };
  const eventEnd = isAllDayEvent
    ? { date: updatedEventData.endAt.substring(0, 10) }
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
      eventId: originalEventKey,
      resource: updatedEvent,
    });

    // TODO. 데이터베이스 업데이트 로직은 이벤트 컨트롤러로의 분리를 고려합니다.
    await Event.findOneAndUpdate(
      { eventId: response.data.eventId },
      {
        $set: {
          timeZone: eventStart.timeZone || updatedEventData.timezone.trim(),
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
