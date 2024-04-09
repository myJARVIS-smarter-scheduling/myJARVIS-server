const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const { User, Account } = require("../models/User");
const { Event } = require("../models/Event");
const {
  saveOutlookUserAndCalendar,
} = require("../controllers/calendar.controller");

const mockUserInfo = {
  email: "user@example.com",
  name: "Mock User",
  provider: "microsoft",
  timezone: "Asia/Seoul",
  language: "en",
};

const existingUserInfo = {
  email: "user@example.com",
  name: "Mock User",
  provider: "microsoft",
  timezone: "Asia/Seoul",
  language: "en",
  accessToken: "oldAccessToken",
};

const mockEvent = {
  title: "Test Event",
  place: "Test Place",
  startAt: "2024-04-08T14:00:00.000Z",
  endAt: "2024-04-08T15:00:00.000Z",
  timezone: "Asia/Seoul",
  attendees: [],
  description: "Test Description",
  provider: "microsoft",
  eventId: "event1",
};

const mockEventList = [
  {
    subject: "Test Event",
    originalStartTimeZone: "UTC",
    location: "Test Place",
    attendees: [],
    bodyPreview: "Test Description",
    start: {
      dateTime: "2024-04-08T14:00:00.000Z",
      timeZone: "Asia/Seoul",
    },
    end: {
      dateTime: "2024-04-08T15:00:00.000Z",
      timeZone: "UTC",
    },
    provider: "google",
    id: "event1",
  },
];

jest.mock("../services/convertDateWithTimezone", () => ({
  convertTimezoneWithDST: jest
    .fn()
    .mockImplementation((dateTime, provider, userTimezone) => {
      return new Date(dateTime);
    }),
}));

describe("Microsoft Calendar Saving", () => {
  beforeEach(async () => {
    jest.clearAllMocks();

    await User.deleteMany({});
    await Account.deleteMany({});
    await Event.deleteMany({});
  });

  it("Should save new user data to the database when both userId and user are not present", async () => {
    const req = {
      cookies: {},
      body: {
        accountsData: [
          {
            userInfo: {
              mail: mockUserInfo.email,
              displayName: mockUserInfo.name,
            },
            mailboxSettings: {
              timeZone: mockUserInfo.timezone,
              locale: mockUserInfo.language,
            },
            calendarEvents: { value: mockEventList },
            accessToken: "newAccessToken",
          },
        ],
      },
    };
    const res = {
      cookie: jest.fn(),
      accountEventList: jest.fn(),
      status: jest.fn().mockReturnValue({ json: jest.fn() }),
    };

    await saveOutlookUserAndCalendar(req, res);

    const user = await User.findOne({ email: mockUserInfo.email });

    expect(user).toBeTruthy();
    expect(user.name).toBe(mockUserInfo.name);
    expect(user.timezone).toBe(mockUserInfo.timezone);
  });

  it("Should update tokens in the database when user exists but userId is not present", async () => {
    await User.create(existingUserInfo);

    const req = {
      cookies: {},
      body: {
        accountsData: [
          {
            userInfo: {
              mail: mockUserInfo.email,
              displayName: mockUserInfo.name,
            },
            mailboxSettings: {
              timeZone: mockUserInfo.timezone,
              locale: mockUserInfo.language,
            },
            calendarEvents: { value: mockEventList },
            accessToken: "newAccessToken",
          },
        ],
      },
    };
    const res = {
      cookie: jest.fn(),
      accountEventList: jest.fn(),
      status: jest.fn().mockReturnValue({ json: jest.fn() }),
    };

    await saveOutlookUserAndCalendar(req, res);

    const updatedUser = await User.findOne({ email: existingUserInfo.email });
    console.log("updatedUser", updatedUser);
    expect(updatedUser.accessToken).toBe("newAccessToken");
  });

  it("Should save new account data to the database when account does not exist", async () => {
    const req = {
      cookies: {},
      body: {
        accountsData: [
          {
            userInfo: {
              mail: mockUserInfo.email,
              displayName: mockUserInfo.name,
            },
            mailboxSettings: {
              timeZone: mockUserInfo.timezone,
              locale: mockUserInfo.language,
            },
            calendarEvents: { value: mockEventList },
            accessToken: "newAccessToken",
          },
        ],
      },
    };
    const res = {
      cookie: jest.fn(),
      accountEventList: jest.fn(),
      status: jest.fn().mockReturnValue({ json: jest.fn() }),
    };

    await saveOutlookUserAndCalendar(req, res);

    const user = await User.findOne({ email: mockUserInfo.email });
    const account = await Account.findOne({ userId: user._id });

    expect(account).toBeTruthy();
    expect(account.email).toBe(mockUserInfo.email);
    expect(account.provider).toBe(mockUserInfo.provider);
    expect(account.accessToken).toBe("newAccessToken");
  });

  it("Should save events to the database through saveCalendarEvents when the event list contains one or more events", async () => {
    const req = {
      cookies: {},
      body: {
        accountsData: [
          {
            userInfo: {
              mail: mockUserInfo.email,
              displayName: mockUserInfo.name,
            },
            mailboxSettings: {
              timeZone: mockUserInfo.timezone,
              locale: mockUserInfo.language,
            },
            calendarEvents: { value: mockEventList },
            accessToken: "newAccessToken",
          },
        ],
      },
    };
    const res = {
      cookie: jest.fn(),
      redirect: jest.fn(),
      status: jest.fn().mockReturnValue({ json: jest.fn() }),
    };

    await saveOutlookUserAndCalendar(req, res);

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
