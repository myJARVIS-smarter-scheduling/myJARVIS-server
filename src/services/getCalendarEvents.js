const { google } = require("googleapis");

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
