const { Event } = require("../models/Event");

async function saveCalendarEvents(accountId, events, provider, timezone) {
  try {
    const eventPromises = events.map(async (event) => {
      const eventId = event.id;
      const existingEvent = await Event.findOne({ eventId });

      const newEventData = {
        accountId,
        title: event.summary || event.subject,
        place:
          typeof event.location === "string"
            ? event.location
            : event.location?.displayName || "No place",
        timezone: event.start.timeZone || timezone,
        attendees:
          provider === "google"
            ? event.attendees?.map((attendee) => attendee.email)
            : event.attendees?.map((attendee) => attendee.emailAddress.name),
        description: event.description || event.bodyPreview || "No description",
        startAt: new Date(event.start.dateTime || event.start.date),
        endAt: new Date(event.end.dateTime || event.end.date),
        provider,
        eventId,
      };

      if (!existingEvent) {
        console.log(`Event ${eventId} is new. it will be saved.`);

        return Event.create(newEventData);
      }
      console.log(`Event ${eventId} already exists. it will be updated.`);

      return null;
    });

    await Promise.all(eventPromises);
  } catch (error) {
    console.log("Error saving calendar events:", error);

    throw error;
  }
}

exports.saveCalendarEvents = saveCalendarEvents;
