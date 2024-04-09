const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const { User, Account } = require("../models/User");
const { Event } = require("../models/Event");
const {
  saveGoogleUserAndCalendar,
} = require("../controllers/calendar.controller");

const mockUserInfo = {
  email: "user@example.com",
  name: "Mock User",
  provider: "google",
  timezone: "Asia/Seoul",
  language: "en",
};

const existingUserInfo = {
  email: "user@example.com",
  name: "Mock User",
  provider: "google",
  timezone: "Asia/Seoul",
  language: "en",
  accessToken: "oldAccessToken",
  refreshToken: "oldRefreshToken",
};

const mockEvent = {
  title: "Test Event",
  place: "Test Place",
  startAt: "2024-04-08T14:00:00.000Z",
  endAt: "2024-04-08T15:00:00.000Z",
  timezone: "Asia/Seoul",
  attendees: [],
  description: "Test Description",
  provider: "google",
  eventId: "event1",
};

jest.mock("../services/getGoogleAuth", () => {
  const mockTokens = {
    access_token: "mockAccessToken",
    refresh_token: "mockRefreshToken",
    expires_in: 3600,
  };

  return {
    googleLogin: jest.fn().mockResolvedValue({ tokens: mockTokens }),
  };
});

jest.mock("../services/getUserInfo", () => ({
  getGoogleUserInfo: jest.fn().mockResolvedValue({
    email: "user@example.com",
    name: "Mock User",
    provider: "google",
    timezone: "Asia/Seoul",
    language: "en",
  }),
}));

jest.mock("../services/getCalendarEvents", () => ({
  getGoogleCalendarEvents: jest.fn().mockResolvedValue([
    {
      summary: "Test Event",
      location: "Test Place",
      attendees: [],
      description: "Test Description",
      start: {
        dateTime: "2024-04-08T14:00:00.000Z",
        timeZone: "Asia/Seoul",
      },
      end: {
        dateTime: "2024-04-08T15:00:00.000Z",
        timeZone: "Asia/Seoul",
      },
      provider: "google",
      id: "event1",
    },
  ]),
}));

describe("Google Calendar Saving", () => {
  beforeEach(async () => {
    jest.clearAllMocks();

    await User.deleteMany({});
    await Account.deleteMany({});
    await Event.deleteMany({});
  });

  it("Should save new user data to the database when both userId and user are not present", async () => {
    const req = { query: { code: "mockCode" }, cookies: {} };
    const res = { cookie: jest.fn(), redirect: jest.fn() };

    await saveGoogleUserAndCalendar(req, res);

    const user = await User.findOne({ email: mockUserInfo.email });

    expect(user).toBeTruthy();
    expect(user.name).toBe(mockUserInfo.name);
    expect(user.timezone).toBe(mockUserInfo.timezone);
  });

  it("Should update tokens in the database when user exists but userId is not present", async () => {
    const existingUser = await User.create(existingUserInfo);

    expect(existingUser.accessToken).toBe("oldAccessToken");
    expect(existingUser.refreshToken).toBe("oldRefreshToken");

    const req = { query: { code: "mockCode" }, cookies: {} };
    const res = { cookie: jest.fn(), redirect: jest.fn() };

    await saveGoogleUserAndCalendar(req, res);

    const user = await User.findOne({ email: existingUserInfo.email });

    expect(user).toBeTruthy();
    expect(user.name).toBe(existingUserInfo.name);
    expect(user.timezone).toBe(existingUserInfo.timezone);
    expect(user.accessToken).toBe("mockAccessToken");
    expect(user.refreshToken).toBe("mockRefreshToken");
  });

  it("Should save new account data to the database when account does not exist", async () => {
    const req = { query: { code: "mockCode" }, cookies: {} };
    const res = { cookie: jest.fn(), redirect: jest.fn() };

    await saveGoogleUserAndCalendar(req, res);

    const user = await User.findOne({ email: mockUserInfo.email });
    const account = await Account.findOne({ userId: user._id });

    expect(account).toBeTruthy();
    expect(account.email).toBe(mockUserInfo.email);
    expect(account.provider).toBe(mockUserInfo.provider);
    expect(account.accessToken).toBe("mockAccessToken");
    expect(account.refreshToken).toBe("mockRefreshToken");
  });

  it("Should save events to the database through saveCalendarEvents when the event list contains one or more events", async () => {
    const req = { query: { code: "mockCode" }, cookies: {} };
    const res = { cookie: jest.fn(), redirect: jest.fn() };

    await saveGoogleUserAndCalendar(req, res);

    const event = await Event.findOne({ eventId: mockEvent.eventId });

    expect(event).toBeTruthy();
    expect(event.title).toBe(mockEvent.title);
    expect(event.place).toBe(mockEvent.place);
    expect(event.timezone).toBe(mockEvent.timezone);
    expect(event.description).toBe(mockEvent.description);
    expect(event.provider).toBe(mockEvent.provider);
    expect(event.startAt.toISOString()).toBe(mockEvent.startAt);
    expect(event.endAt.toISOString()).toBe(mockEvent.endAt);
  });
});
