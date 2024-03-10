const { google } = require("googleapis");
const axios = require("axios");

exports.getGoogleCalendarEvents = async (accessToken) => {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  try {
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      maxResults: 250,
      singleEvents: true,
      orderBy: "startTime",
    });

    return response.data.items;
  } catch (error) {
    console.log("Get google calendar events error:", error);

    throw error;
  }
};

exports.getOutlookCalendarEvents = async (accessToken) => {
  const startDate = new Date();
  const endDate = new Date();

  endDate.setMonth(startDate.getMonth() + 3);

  const calendarConfig = {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    params: {
      startDateTime: startDate.toISOString(),
      endDateTime: endDate.toISOString(),
    },
  };

  try {
    const response = await axios.get(
      "https://graph.microsoft.com/v1.0/me/calendarview",
      calendarConfig,
    );

    return response.data.value;
  } catch (error) {
    console.log("Get outlook calendar events error:", error);

    throw error;
  }
};
