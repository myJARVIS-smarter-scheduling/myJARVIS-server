/* eslint-disable */
const { Event } = require("../models/Event");
const { TIMEZONE_LIST } = require("../constants/timezone");
const { convertTimezoneWithDST } = require("./convertDateWithTimezone");

exports.saveCalendarEvents = async (
  accountId,
  events,
  provider,
  userTimezone,
  session = null
) => {
  try {
    const fetchedEventIds = events.map((event) => event.id);
    const deleteCondition = { accountId, eventId: { $nin: fetchedEventIds } };

    if (provider === "google") {
      deleteCondition.startAt = { $gte: new Date() };
    }

    await Event.deleteMany(deleteCondition, { session });

    const eventPromises = events.map(async (event) => {
      const eventId = event.id;
      const etag = event.etag || event["@odata.etag"];
      const eventTimezone = TIMEZONE_LIST.find(
        (timezone) =>
          timezone.alt === event.originalStartTimeZone ||
          timezone.value === event.originalStartTimeZone
      );

      let convertedStartWithUserTimezone;
      let convertedEndWithUserTimezone;
      let formattedEventTimezone;

      if (provider === "microsoft") {
        convertedStartWithUserTimezone = await convertTimezoneWithDST(
          event.start.dateTime,
          provider,
          userTimezone
        );

        convertedEndWithUserTimezone = await convertTimezoneWithDST(
          event.end.dateTime,
          provider,
          userTimezone
        );
      }

      const existingEvent = await Event.findOne({ eventId });

      if (provider === "microsoft") {
        event.originalStartTimeZone === "UTC"
          ? (formattedEventTimezone = userTimezone)
          : (formattedEventTimezone = eventTimezone?.value
              ? eventTimezone.value
              : userTimezone);
      }

      const newEventData = {
        accountId,
        title: event.summary || event.subject,
        place:
          typeof event.location === "string"
            ? event.location
            : event.location?.displayName || "No place",
        timezone:
          provider === "google" ? event.start.timeZone : formattedEventTimezone,
        attendees:
          provider === "google"
            ? event.attendees?.map((attendee) => attendee.email)
            : event.attendees?.map((attendee) => attendee.emailAddress.name),
        description: event.description || event.bodyPreview || "No description",
        startAt:
          provider === "google"
            ? new Date(event.start.dateTime || event.start.date)
            : convertedStartWithUserTimezone,
        endAt:
          provider === "google"
            ? new Date(event.end.dateTime || event.end.date)
            : convertedEndWithUserTimezone,
        provider,
        eventId,
        etag,
      };

      if (existingEvent) {
        console.log(`Event ${eventId} already exists. It will be updated.`);

        return Event.updateOne({ eventId }, newEventData, {
          upsert: true,
          session,
        });
      } else {
        console.log(`Event ${eventId} is new. it will be saved.`);

        return Event.create([newEventData], { session });
      }
    });

    const eventList = await Promise.all(eventPromises);

    return eventList;
  } catch (error) {
    console.log("Error saving calendar events:", error);

    throw error;
  }
};
