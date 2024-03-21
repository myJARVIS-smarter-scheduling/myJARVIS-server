const axios = require("axios");

const { TIMEZONE_LIST } = require("../constants/timezone");
const { convertUtcDate } = require("../utils/parsetDateformat");

exports.convertTimezoneWithDST = async (date, targetTimezoneId) => {
  const utcDate = typeof date === "string" ? convertUtcDate(date) : date;
  const timestamp = utcDate.getTime() / 1000;

  const timezoneUrl = "https://maps.googleapis.com/maps/api/timezone/json";

  const eventTimeZone = TIMEZONE_LIST.find(
    (timezone) => timezone.value === targetTimezoneId,
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

exports.convertTimezoneWithoutDST = async (date, targetTimezoneId) => {
  const utcDate = typeof date === "string" ? convertUtcDate(date) : date;
  const timestamp = utcDate.getTime() / 1000;

  const timezoneUrl = "https://maps.googleapis.com/maps/api/timezone/json";

  const eventTimeZone = TIMEZONE_LIST.find(
    (timezone) => timezone.value === targetTimezoneId,
  );

  console.log("eventTimeZone:", eventTimeZone);
  console.log("eventTimeZone.latitude:", eventTimeZone.lat);
  console.log("eventTimeZone.longitude:", eventTimeZone.long);
  console.log("timestamp:", timestamp);

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

    return targetTime;
  } catch (error) {
    console.log("Google timezone error:", error);

    throw error;
  }
};
