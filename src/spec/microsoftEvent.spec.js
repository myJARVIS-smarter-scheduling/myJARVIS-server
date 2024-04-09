const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const { User, Account } = require("../models/User");
const { Event } = require("../models/Event");
const {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} = require("../controllers/events.controller");

const existingUserInfo = {
  email: "user@example.com",
  name: "Mock User",
  provider: "microsoft",
  timezone: "Asia/Seoul",
  language: "en",
  accessToken: "oldAccessToken",
  refreshToken: "oldRefreshToken",
};

const mockNewEvent = {
  eventId: "newEvent1",
  title: "Test Event",
  place: "Test Place",
  startAt: "2024-04-08T14:00:00.000Z",
  endAt: "2024-04-08T15:00:00.000Z",
  timezone: "Asia/Seoul",
  description: "Test Description",
  isAllDayEvent: false,
  provider: "microsoft",
};

const mockUpdateEvent = {
  eventId: "newEvent1",
  title: "Update Event",
  place: "Update Place",
  startAt: "2024-04-08T14:00:00.000Z",
  endAt: "2024-04-08T15:00:00.000Z",
  timezone: "Asia/Seoul",
  description: "Update Description",
  isAllDayEvent: false,
  provider: "microsoft",
};

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

jest.mock("../middlewares/verifyToken", () => (req, res, next) => next());

jest.mock("axios", () => ({
  post: jest.fn((url, body, config) => {
    if (url.includes("https://graph.microsoft.com/v1.0/me/events")) {
      return Promise.resolve({
        data: { ...mockNewEvent, id: mockNewEvent.eventId },
      });
    }
  }),
  patch: jest.fn((url, body, config) => {
    if (url.includes("https://graph.microsoft.com/v1.0/me/events")) {
      return Promise.resolve({
        data: {
          updated: true,
          ...mockUpdateEvent,
        },
      });
    }
  }),
  delete: jest.fn((url, config) => {
    if (url.includes("https://graph.microsoft.com/v1.0/me/events")) {
      return Promise.resolve({ data: {} });
    }
  }),
}));

describe.only("Google Calendar Events API", () => {
  beforeEach(async () => {
    jest.clearAllMocks();

    const user = await User.create(existingUserInfo);
    const userId = user._id;

    await Account.create({
      userId,
      provider: "microsoft",
      email: "user@example.com",
      accessToken: "mockAccessToken",
    });
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Account.deleteMany({});
    await Event.deleteMany({});
  });

  it("should create a new Microsoft Calendar format event and save it to the database", async () => {
    const account = await Account.findOne({ email: "user@example.com" });
    const accountId = account._id;

    const req = {
      body: {
        newEventData: { ...mockNewEvent, id: mockNewEvent.eventId, accountId },
      },
    };
    const res = mockResponse();
    const next = jest.fn();

    await createCalendarEvent(req, res, next);

    const newEvent = await Event.findOne({ eventId: mockNewEvent.eventId });

    expect(newEvent).toBeTruthy();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ result: "success" })
    );
  });

  it("should update an existing Microsoft Calendar format event and save it to the database", async () => {
    const existingAccount = await Account.findOne({
      email: "user@example.com",
    });
    const accountId = existingAccount._id;

    await Event.create({ accountId, ...mockNewEvent });

    const existingEvent = await Event.findOne({
      accountId,
    });
    const mongooseEventId = existingEvent._id;

    const req = {
      body: {
        updatedEventData: { ...mockUpdateEvent, dataId: mongooseEventId },
      },
    };
    const res = mockResponse();
    const next = jest.fn();

    await updateCalendarEvent(req, res, next);

    const updatedEvent = await Event.findById(mongooseEventId);

    expect(updatedEvent).toBeTruthy();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ result: "success" })
    );
    expect(updatedEvent.title).toBe(mockUpdateEvent.title);
    expect(updatedEvent.place).toBe(mockUpdateEvent.place);
    expect(updatedEvent.description).toBe(mockUpdateEvent.description);
  });

  it("should delete an existing Microsoft Calendar format event from the database", async () => {
    const existingAccount = await Account.findOne({
      email: "user@example.com",
    });
    const accountId = existingAccount._id;

    await Event.create({ accountId, ...mockNewEvent });

    const existingEvent = await Event.findOne({
      accountId,
    });
    const mongooseEventId = existingEvent._id;

    const req = {
      params: { eventId: mongooseEventId },
      body: { accountId },
    };
    const res = mockResponse();
    const next = jest.fn();

    await deleteCalendarEvent(req, res, next);

    const deletedEvent = await Event.findById(mongooseEventId);

    expect(deletedEvent).toBeFalsy();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ result: "success" })
    );
  });
});
