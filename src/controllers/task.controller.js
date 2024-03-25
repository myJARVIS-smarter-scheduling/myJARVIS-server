/* eslint-disable consistent-return */
const axios = require("axios");
const { URLSearchParams } = require("url");

const { AsanaUser, AsanaWorkspace } = require("../models/AsanaUser");
const { AsanaTask } = require("../models/AsanaTask");

async function fetchDependDetails(dependProperty, accessToken) {
  const dependDetails = await Promise.all(
    dependProperty.map(async (dependType) => {
      const response = await axios.get(
        `https://app.asana.com/api/1.0/tasks/${dependType.gid}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      return response.data.data;
    }),
  );

  return dependDetails;
}

exports.fetchAsanaTasks = async (req, res, next) => {
  const { userId } = req.cookies;
  const asanaUser = await AsanaUser.findOne({ userId });

  if (!asanaUser) {
    console.error("Asana user not found");

    return res.status(404).send("User not found");
  }

  const asanaUserAccessToken = asanaUser.accessToken;

  try {
    // TODO: 해당 함수는 분리하여 태스크 생성에도 사용합니다.
    const tasksRequests = asanaUser.workspaces.map(async (workspace) => {
      const params = new URLSearchParams({
        workspace: workspace.workspaceKey,
        completed_since: "now",
        assignee: "me",
        opt_fields:
          "name,projects,dependencies,dependents,permalink_url,start_on,start_at,due_on,due_at,custom_fields",
      }).toString();

      const response = await axios.get(
        `https://app.asana.com/api/1.0/tasks?${params}`,
        {
          headers: {
            Authorization: `Bearer ${asanaUserAccessToken}`,
          },
        },
      );

      const mappedWorkspace = await AsanaWorkspace.findOne({
        workspaceKey: workspace.workspaceKey,
      });

      if (!mappedWorkspace) {
        console.error("Mapped workspace not found");

        return;
      }

      return {
        tasks: response.data.data,
        workspaceId: mappedWorkspace._id,
      };
    });

    const tasksResponses = await Promise.all(tasksRequests);

    await Promise.all(
      tasksResponses.map(async (tasksResponse) => {
        if (!tasksResponse) return;

        const { tasks, workspaceId } = tasksResponse;

        await Promise.all(
          tasks.map(async (task) => {
            const existingTask = await AsanaTask.findOne({ taskKey: task.gid });
            const dependenciesInfo = await fetchDependDetails(
              task.dependencies,
              asanaUserAccessToken,
            );
            const dependentsInfo = await fetchDependDetails(
              task.dependents,
              asanaUserAccessToken,
            );

            const taskData = {
              userId,
              asanaId: asanaUser._id,
              workspaceId,
              taskKey: task.gid,
              title: task.name,
              link: task.permalink_url,
              projects: task.projects,
              startOn: task.start_on,
              startAt: task.start_at,
              dueOn: task.due_on,
              dueAt: task.due_at,
              dependencies: dependenciesInfo,
              dependents: dependentsInfo,
              customFields: task.custom_fields,
            };

            if (existingTask) {
              await AsanaTask.findByIdAndUpdate(existingTask._id, taskData);
            } else {
              const newTask = new AsanaTask(taskData);
              await newTask.save();
            }
          }),
        );
      }),
    );

    res.redirect(process.env.HOME_REDIRECT_URL);
  } catch (error) {
    console.error("Error fetching Asana tasks:", error);

    return null;
  }
};

exports.transferAsanaTasks = async (req, res, next) => {
  const { userId } = req.cookies;

  try {
    const asanaUser = await AsanaUser.findOne({ userId }).populate({
      path: "workspaces",
      model: "AsanaWorkspace",
    });

    if (!asanaUser) {
      console.error("Asana user not found");

      return res.status(404).send("User not found");
    }

    const taskPromiseList = asanaUser.workspaces.map(async (workspace) => {
      const task = await AsanaTask.find({ workspaceId: workspace._id });

      return {
        asanaId: asanaUser._id,
        workspaceId: workspace._id,
        workspaceName: workspace.name,
        task,
      };
    });

    const taskList = await Promise.all(taskPromiseList);
    const asanaUserInfo = {
      name: asanaUser.name,
      email: asanaUser.email,
    };

    res.status(200).json({
      result: "success",
      asanaUserInfo,
      taskList,
    });
  } catch (error) {
    console.error("Asana user not found:", error);

    throw error;
  }
};

exports.completeAsanaTask = async (req, res, next) => {
  console.log("Asana task completing...");
  const { userId } = req.cookies;
  const { taskKey } = req.body;
  const asanaUser = await AsanaUser.findOne({ userId });

  try {
    const response = await axios.put(
      `https://app.asana.com/api/1.0/tasks/${taskKey}`,
      { data: { completed: true } },
      {
        headers: {
          Authorization: `Bearer ${asanaUser.accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    const completedTaskKey = response.data.data.gid;

    await AsanaTask.findOneAndDelete({ taskKey: completedTaskKey });

    res.status(200).send({ result: "success" });
  } catch (error) {
    console.error("Error archiving Asana task:", error);

    throw error;
  }
};

// TODO. 추후 모든 기능이 완료되고 난 후 추가 작업 및 연결 작업 진행합니다.
exports.createAsanaTask = async (req, res, next) => {
  const { userId, accessToken } = req.cookies;
  const { asanaId, workspaceId, taskInfo } = req.body;

  try {
    const asanaUser = await AsanaUser.findById(asanaId);
    const workspace = await AsanaWorkspace.findById(workspaceId);

    const response = await axios.post(
      `https://app.asana.com/api/1.0/tasks`,
      { data: taskInfo },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    const createdTask = response.data.data;
    const createdTaskKey = createdTask.gid;

    console.log("Task created:", response.data);
  } catch (error) {
    console.error("Error creating Asana task:", error);

    throw error;
  }
};

// TODO. 추후 모든 기능이 완료되고 난 후 클라이언트와 연결 작업 진행합니다.
exports.updateAsanaTask = async (req, res, next) => {
  const { accessToken } = req.cookies;
  const { taskKey, updatedTask, taskId } = req.body;

  try {
    const response = await axios.put(
      `https://app.asana.com/api/1.0/tasks/${taskKey}`,
      { data: updatedTask },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    const targetTask = await AsanaTask.findByIdAndUpdate(taskId, updatedTask, {
      new: true,
    });

    res.status(200).send({ result: "success", updatedTask: targetTask });
  } catch (error) {
    console.error("Error updating Asana task:", error);

    throw error;
  }
};

// TODO. 추후 모든 기능이 완료되고 난 후 작업 진행합니다.
// exports.deleteAsanaTask = async (req, res, next) => {};
