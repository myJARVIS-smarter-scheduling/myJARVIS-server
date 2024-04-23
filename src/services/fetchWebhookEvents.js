const axios = require("axios");
const { google } = require("googleapis");
const googleOAuth2Client = require("../config/googleOAuthClient");
const { Event } = require("../models/Event");

exports.fetchChangesFromGoogle = async (accessToken, resourceState) => {
  googleOAuth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: "v3", auth: googleOAuth2Client });

  try {
    console.log("Fetching changes from Google Calendar");

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: "startTime",
    });

    const changes = await Promise.all(
      response.data.items.map(async (event) => {
        console.log("Changes Event", event);
        const existingEvent = await Event.findOne({ eventId: event.id });
        const isAllDayEvent = !!event.start.date;
        const startAt = isAllDayEvent ? event.start.date : event.start.dateTime;
        const endAt = isAllDayEvent ? event.end.date : event.end.dateTime;
        let eventType;

        if (resourceState === "exists" && existingEvent) {
          eventType = "updated";
        }

        if (resourceState === "exists" && !existingEvent) {
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
      }),
    );

    return changes;
  } catch (error) {
    console.error("Failed to fetch changes from Google Calendar:", error);
    throw error;
  }
};
