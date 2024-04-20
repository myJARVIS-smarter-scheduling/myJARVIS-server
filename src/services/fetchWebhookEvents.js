const axios = require("axios");
const { google } = require("googleapis");
const googleOAuth2Client = require("../config/googleOAuthClient");
const { Event } = require("../models/Event");

exports.fetchChangesFromGoogle = async (
  accessToken,
  resourceId,
  resourceState,
) => {
  googleOAuth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: "v3", auth: googleOAuth2Client });

  try {
    const response = await calendar.events.list({
      calendarId: "primary",
      eventId: resourceId,
    });

    return response.data.items.map((event) => {
      const isAllDayEvent = !!event.start.date;
      const startAt = isAllDayEvent ? event.start.date : event.start.dateTime;
      const endAt = isAllDayEvent ? event.end.date : event.end.dateTime;
      let eventType;

      if (resourceState === "not_exists") {
        eventType = "deleted";
      } else if (resourceState === "exists") {
        eventType = "updated";
      } else {
        eventType = "created";
      }

      return {
        title: event.summary,
        place: event.location || "No place",
        timezone: event.start.timeZone,
        description: event.description || "No description",
        attendees: event.attendees?.map((attendee) => attendee.email),
        startAt,
        endAt,
        provider: "google",
        isAllDay: isAllDayEvent,
        eventId: event.id,
        type: eventType,
      };
    });
  } catch (error) {
    console.error("Failed to fetch changes from Google Calendar:", error);
    throw error;
  }
};

exports.fetchChangesFromMicrosoft = async (accessToken, deltaLink) => {
  try {
    const response = await axios({
      method: "get",
      url: deltaLink || "https://graph.microsoft.com/v1.0/me/events/delta",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const eventList = response.data.value.map((event) => {
      const startDateTime = event.isAllDay
        ? event.start.date
        : event.start.dateTime;
      const endDateTime = event.isAllDay ? event.end.date : event.end.dateTime;

      return {
        title: event.subject,
        place: event.location?.displayName || "No place",
        timezone: event.originalStartTimeZone,
        description: event.body.content || "No description",
        attendees: event.attendees?.map(
          (attendee) => attendee.emailAddress.name,
        ),
        startAt: startDateTime,
        endAt: endDateTime,
        provider: "microsoft",
        isAllDay: event.isAllDay,
        eventId: event.id,
        type: event.changeType,
      };
    });

    return {
      events: eventList,
      nextLink: response.data["@odata.nextLink"],
      deltaLink: response.data["@odata.deltaLink"],
    };
  } catch (error) {
    console.error("Failed to fetch changes from Microsoft Calendar:", error);

    throw error;
  }
};
