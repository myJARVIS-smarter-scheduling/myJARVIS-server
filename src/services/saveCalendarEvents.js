/* eslint-disable */
const { Event } = require("../models/Event");
const { User } = require("../models/User");

const { fetchCalendarEvents } = require("./getCalendarEvents");
const { convertTimezoneWithDST } = require("./convertDateWithTimezone");

exports.saveCalendarEvents = async (accountId, events, provider, timezone) => {
  try {
    const eventPromises = events.map(async (event) => {
      let convertedStartWithUserTimezone;
      let convertedEndWithUserTimezone;

      if (provider !== "google") {
        convertedStartWithUserTimezone = await convertTimezoneWithDST(
          event.start.dateTime,
          provider,
          timezone
        );

        convertedEndWithUserTimezone = await convertTimezoneWithDST(
          event.end.dateTime,
          provider,
          timezone
        );
      }

      const eventId = event.id;
      const existingEvent = await Event.findOne({ eventId });

      const newEventData = {
        accountId,
        title: event.summary || event.subject,
        place:
          typeof event.location === "string"
            ? event.location
            : event.location?.displayName || "No place",
        timezone:
          provider === "google"
            ? event.start.timeZone
            : // : event.originalStartTimeZone || timezone,
              timezone, // 우선적으로 사용자의 타임존을 사용합니다.
        attendees:
          provider === "google"
            ? event.attendees?.map((attendee) => attendee.email)
            : event.attendees?.map((attendee) => attendee.emailAddress.name),
        description: event.description || event.bodyPreview || "No description",
        startAt:
          provider === "google"
            ? new Date(event.start.dateTime || event.start.date)
            : new Date(convertedStartWithUserTimezone),
        endAt:
          provider === "google"
            ? new Date(event.end.dateTime || event.end.date)
            : new Date(convertedEndWithUserTimezone),
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

    const eventList = await Promise.all(eventPromises);

    return eventList;
  } catch (error) {
    console.log("Error saving calendar events:", error);

    throw error;
  }
};

exports.updateCalendarEventsFromWebhook = async (targetAccount) => {
  try {
    const accountId = targetAccount._id.toString();
    const userId = targetAccount.userId;
    const user = User.findById(userId);
    const userTimezone = user.timezone;

    const eventList = await fetchCalendarEvents(targetAccount);
    const eventDatabse = await Event.find({ accountId: targetAccount._id });

    for (const event of eventList) {
      const existingEvent = await Event.findOne({ eventId: event.id });

      if (!existingEvent) {
        console.log(`Event ${event.id} is new. it will be saved.`);

        const newEvent = {
          accountId,
          title: event.summary || event.subject,
          place:
            typeof event.location === "string"
              ? event.location
              : event.location?.displayName || "No place",
          timezone: event.start.timeZone || userTimezone,
          attendees: event.attendees?.map((attendee) => attendee.email),
          description:
            event.description || event.bodyPreview || "No description",
          startAt: new Date(event.start.dateTime || event.start.date),
          endAt: new Date(event.end.dateTime || event.end.date),
          provider,
          eventId: event.id,
        };

        await Event.create(newEvent);
      } else {
        console.log(`Event ${event.id} already exists. it will be updated.`);

        await Event.findOneAndUpdate(
          { eventId: event.id },
          {
            title: event.summary || event.subject,
            place:
              typeof event.location === "string"
                ? event.location
                : event.location?.displayName || "No place",
            timezone: event.start.timeZone || userTimezone,
            attendees: event.attendees?.map((attendee) => attendee.email),
            description:
              event.description || event.bodyPreview || "No description",
            startAt: new Date(event.start.dateTime || event.start.date),
            endAt: new Date(event.end.dateTime || event.end.date),
          },
          { new: true }
        );
      }
    }

    for (const dbEvent of eventDatabse) {
      const existingEvent = eventList.find(
        (event) => event.id === dbEvent.eventId
      );

      if (!existingEvent) {
        console.log(`Event ${dbEvent.eventId} is deleted. it will be removed.`);

        await Event.findOneAndDelete({ eventId: dbEvent.eventId });
      }
    }
  } catch (error) {
    console.error("Error fetching changed events:", error);

    throw error;
  }
};
