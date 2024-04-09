const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const { User } = require("../models/User");
const { AsanaTask } = require("../models/AsanaTask");
const { AsanaUser, AsanaWorkspace } = require("../models/AsanaUser");
const {
  fetchAsanaTasks,
  transferAsanaTasks,
  completeAsanaTask,
} = require("../controllers/task.controller");

const existingUserInfo = {
  email: "user@example.com",
  name: "Mock User",
  provider: "microsoft",
  timezone: "Asia/Seoul",
  language: "en",
  accessToken: "oldAccessToken",
  refreshToken: "oldRefreshToken",
};

const currentDate = new Date();
const mockAsanaUser = {
  asanaKey: "mockAsanaKey",
  name: "Mock Asana User",
  email: "user@example.com",
  workspaces: [],
  accessToken: "mockAccessToken",
  refreshToken: "mockRefreshToken",
  tokenExpiredAt: new Date(currentDate.getTime() + 1 * 60 * 60 * 1000),
};

const mockAsanaTaskData = {
  gid: "12345",
  name: "Test Task",
  permalink_url: "https://app.asana.com/0/mockTaskKey",
  projects: [{ gid: "project1", name: "Project 1" }],
  dependencies: [],
  dependents: [],
  custom_fields: [],
  start_on: null,
  start_at: null,
  due_on: null,
  due_at: null,
};

jest.mock("axios", () => ({
  get: jest.fn((url, config) => {
    if (
      url.includes("https://app.asana.com/api/1.0/tasks/") &&
      !url.includes("?")
    ) {
      return Promise.resolve({
        data: {
          data: {
            gid: url.split("/").pop(),
            name: "Dependency Task",
            permalink_url: "http://example.com/dep-task",
            projects: [],
            dependencies: [],
            dependents: [],
            custom_fields: [],
          },
        },
      });
    }
    if (url.includes("https://app.asana.com/api/1.0/tasks?")) {
      return Promise.resolve({
        data: {
          data: [
            {
              gid: "1234567890",
              name: "Test Task",
              permalink_url: "http://example.com/task-1",
              projects: [{ gid: "1234", name: "Project 1" }],
              dependencies: [],
              dependents: [],
              custom_fields: [],
              start_on: null,
              start_at: null,
              due_on: null,
              due_at: null,
            },
          ],
        },
      });
    }
  }),
  put: jest.fn((url, body, config) => {
    if (url.startsWith("https://app.asana.com/api/1.0/tasks/")) {
      return Promise.resolve({
        data: {
          data: {
            gid: url.split("/").pop(),
            completed: body.data.completed,
          },
        },
      });
    }
  }),
}));

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);

  return res;
};

describe("Asana Task Controller", () => {
  beforeAll(async () => {
    const user = await User.create(existingUserInfo);
    const asanaUser = await AsanaUser.create({
      ...mockAsanaUser,
      userId: user._id,
    });
    const mockWorkSpace = {
      asanaId: asanaUser._id,
      name: "Mock Workspace",
      workspaceKey: "mockWorkspaceKey",
      type: "workspace",
    };

    await AsanaWorkspace.create(mockWorkSpace);
    const workspace = await AsanaWorkspace.findOne({ asanaId: asanaUser._id });

    asanaUser.workspaces.push(workspace);

    await asanaUser.save();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await User.deleteMany({});
    await AsanaUser.deleteMany({});
    await AsanaTask.deleteMany({});
  });

  it("should fetch tasks from Asana API and save them to the database", async () => {
    const user = await User.findOne({ email: "user@example.com" });
    const userId = user._id;

    const req = { cookies: { userId } };
    const res = mockResponse();
    const next = jest.fn();

    await fetchAsanaTasks(req, res, next);

    const savedTasks = await AsanaTask.find({});
    expect(savedTasks.length).toBeGreaterThan(0);
    expect(savedTasks[0].title).toEqual(mockAsanaTaskData.name);
  });

  it("should retrieve tasks from the database and return them", async () => {
    const user = await User.findOne({ email: "user@example.com" });
    const userId = user._id;

    const req = { cookies: { userId } };
    const res = mockResponse();
    const next = jest.fn();

    await transferAsanaTasks(req, res, next);

    expect(res.json.mock.calls.length).toBeGreaterThan(0);

    const taskResponse = res.json.mock.calls[0][0];

    expect(taskResponse.taskList).toBeDefined();
    expect(taskResponse.taskList.length).toBeGreaterThan(0);
    expect(taskResponse.taskList[0].task[0].title).toEqual(
      mockAsanaTaskData.name
    );
  });

  it("should mark an Asana task as completed and delete it from the database", async () => {
    const user = await User.findOne({ email: "user@example.com" });
    const userId = user._id;

    const req = {
      body: { taskKey: mockAsanaTaskData.gid },
      cookies: { userId },
    };
    const res = mockResponse();
    const next = jest.fn();

    await completeAsanaTask(req, res, next);

    const deletedTask = await AsanaTask.findOne({
      taskKey: mockAsanaTaskData.gid,
    });

    expect(deletedTask).toBeFalsy();
    expect(res.send).toHaveBeenCalledWith({ result: "success" });
  });
});
