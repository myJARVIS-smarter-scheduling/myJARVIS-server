const axios = require("axios");
const {
  convertTimezoneWithDST,
  convertTimezoneWithoutDST,
} = require("./convertDateWithTimezone");

const { Account, User } = require("../models/User");
const { Event } = require("../models/Event");
const { TIMEZONE_LIST } = require("../constants/timezone");

exports.createOutlookCalendarEvent = async (
  accountId,
  accessToken,
  newEventData,
) => {
  console.log("create Outlook Calendar Event");
  console.log("newEventData", newEventData);
  console.log("accessToken", accessToken);
  console.log("timezone", newEventData.timezone);
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
  const hasTimezoneSetting = formattedUserTimezone !== formattedEventTimezone;
  console.log("formattedUserTimezone", formattedUserTimezone);
  console.log("formattedEventTimezone", formattedEventTimezone);
  console.log("userTimezone", userTimezone);

  const eventPlace = newEventData.place || "No place";
  const eventDescription = newEventData.description || "No description";
  const { startAt, endAt, timezone, isAllDayEvent, provider } = newEventData;
  console.log("startAt", startAt);
  console.log("endAt", endAt);
  let startAtDate = new Date(startAt);
  let endAtDate = new Date(endAt);
  console.log("startAtDate1", startAtDate);
  console.log("endAtDate1", endAtDate);

  if (!isAllDayEvent && hasTimezoneSetting) {
    const startAtWithSelectedTimezone = await convertTimezoneWithoutDST(
      startAtDate,
      provider,
      timezone,
    );
    const endAtWithSelectedTimezone = await convertTimezoneWithoutDST(
      endAtDate,
      provider,
      timezone,
    );

    console.log("startAtWithSelectedTimezone", startAtWithSelectedTimezone);
    console.log("endAtWithSelectedTimezone", endAtWithSelectedTimezone);

    const startAtWithUserTimezone = await convertTimezoneWithDST(
      startAtWithSelectedTimezone,
      provider,
      userTimezone,
    );
    const endAtWithUserTimezone = await convertTimezoneWithDST(
      endAtWithSelectedTimezone,
      provider,
      userTimezone,
    );

    startAtDate = startAtWithUserTimezone;
    endAtDate = endAtWithUserTimezone;
    // startAtDate = new Date(startAtWithUserTimezone);
    // endAtDate = new Date(endAtWithUserTimezone);
    console.log("startAtDate2", startAtDate);
    console.log("endAtDate2", endAtDate);
  }

  const newEvent = {
    subject: newEventData.title,
    body: {
      contentType: "html",
      content: eventDescription,
    },
    start: {
      dateTime: startAtDate,
      timeZone: hasTimezoneSetting
        ? formattedEventTimezone
        : formattedUserTimezone,
    },
    end: {
      dateTime: endAtDate,
      timeZone: hasTimezoneSetting
        ? formattedEventTimezone
        : formattedUserTimezone,
    },
    location: { displayName: eventPlace },
    isAllDay: !!isAllDayEvent,
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
          timeZone:
            response.data.originalStartTimeZone === "UTC"
              ? formattedUserTimezone
              : formattedEventTimezone,
          // timeZone: formattedEventTimezone,
          startAt: newEvent.start.dateTime,
          endAt: newEvent.end.dateTime,
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
) => {};

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
