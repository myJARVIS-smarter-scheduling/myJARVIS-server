const axios = require("axios");

const { TIMEZONE_LIST } = require("../constants/timezone");
const { convertUtcDate } = require("../utils/parsetDateformat");

exports.convertTimezoneWithDST = async (date, provider, targetTimezoneId) => {
  let utcDate;

  if (provider === "google") {
    utcDate = typeof date === "string" ? convertUtcDate(date) : date;
  } else {
    const formattedDate = new Date(date).toISOString();

    utcDate = new Date(formattedDate);
  }

  const timestamp = utcDate.getTime() / 1000;
  const timezoneUrl = "https://maps.googleapis.com/maps/api/timezone/json";
  const eventTimeZone = TIMEZONE_LIST.find(
    (timezone) =>
      timezone.value === targetTimezoneId || timezone.alt === targetTimezoneId,
  );

  try {
    const response = await axios.get(timezoneUrl, {
      params: {
        location: `${eventTimeZone.lat},${eventTimeZone.long}`,
        timestamp,
        key: process.env.GOOGLE_TIMEZONE_CLIENT_KEY,
      },
    });

    const timezoneData = await response.data;
    const utcOffset = timezoneData.dstOffset + timezoneData.rawOffset;
    const targetTime = new Date((timestamp + utcOffset) * 1000);

    return targetTime;
  } catch (error) {
    console.log("Google timezone error:", error);

    throw error;
  }
};

exports.convertTimezoneWithoutDST = async (
  date,
  provider,
  targetTimezoneId,
) => {
  let utcDate;
  console.log("date:", date);
  console.log("targetTimezoneId", targetTimezoneId);

  if (provider === "google") {
    utcDate = typeof date === "string" ? convertUtcDate(date) : date;
  } else {
    const formattedDate = new Date(date).toLocaleString();
    utcDate = typeof date === "string" ? convertUtcDate(formattedDate) : date;
  }

  const timestamp = utcDate.getTime() / 1000;
  const timezoneUrl = "https://maps.googleapis.com/maps/api/timezone/json";

  const eventTimeZone = TIMEZONE_LIST.find(
    (timezone) =>
      timezone.value === targetTimezoneId || timezone.alt === targetTimezoneId,
  );
  console.log("eventTimeZone", eventTimeZone);
  try {
    const response = await axios.get(timezoneUrl, {
      params: {
        location: `${eventTimeZone.lat},${eventTimeZone.long}`,
        timestamp,
        key: process.env.GOOGLE_TIMEZONE_CLIENT_KEY,
      },
    });

    const timezoneData = await response.data;
    const utcOffset = timezoneData.rawOffset;
    const targetTime = new Date((timestamp + utcOffset) * 1000);
    console.log("targetTime:", targetTime);

    return targetTime;
  } catch (error) {
    console.log("Google timezone error:", error);

    throw error;
  }
};
