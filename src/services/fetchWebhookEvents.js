const axios = require("axios");
const { google } = require("googleapis");
const googleOAuth2Client = require("../config/googleOAuthClient");

exports.fetchChangesFromGoogle = async (accessToken, syncToken) => {
  googleOAuth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: "v3", auth: googleOAuth2Client });

  try {
    const response = await calendar.events.list({
      calendarId: "primary",
      syncToken,
    });

    return response.data.items.map((event) => {
      const isAllDayEvent = !!event.start.date;
      const startAt = isAllDayEvent ? event.start.date : event.start.dateTime;
      const endAt = isAllDayEvent ? event.end.date : event.end.dateTime;

      return {
        title: event.summary,
        place: event.location || "No place",
        timezone: event.start.timeZone || "",
        description: event.description || "",
        startAt,
        endAt,
        provider: "google",
        isAllDay: isAllDayEvent,
        eventId: event.id,
        type: event.status === "cancelled" ? "deleted" : "updated",
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
      const isAllDayEvent = event.isAllDay;
      const startDateTime = isAllDayEvent
        ? event.start.date
        : event.start.dateTime;
      const endDateTime = isAllDayEvent ? event.end.date : event.end.dateTime;

      return {
        title: event.subject,
        place: event.location?.displayName || "No place",
        timezone: event.originalStartTimeZone,
        description: event.body.content || "No description",
        startAt: startDateTime,
        endAt: endDateTime,
        provider: "microsoft",
        isAllDay: isAllDayEvent,
        eventId: event.id,
        type: event.status === "cancelled" ? "deleted" : "updated", // Assume 'updated' unless specified by `event.status`
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
