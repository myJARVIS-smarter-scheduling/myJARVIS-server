/* eslint-disable */

const axios = require("axios");
const { AsanaUser, AsanaWorkspace } = require("../models/AsanaUser");

const saveUserWorkSpace = async (asanaId, accessToken) => {
  try {
    console.log("saveUserWorkSpace");
    let asanaUser = await AsanaUser.findById(asanaId);

    const response = await axios.get(
      "https://app.asana.com/api/1.0/workspaces",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const workspaceList = response.data.data;

    for (const workspace of workspaceList) {
      const { gid, name, resource_type } = workspace;
      const asanaWorkspace = new AsanaWorkspace({
        asanaId,
        name,
        workspaceKey: gid,
        type: resource_type,
      });

      await asanaWorkspace.save();

      asanaUser.workspaces.push(asanaWorkspace);

      await asanaUser.save();
    }
  } catch (error) {
    console.error("Asana workspace error:", error);
  }
};

exports.saveAsanaUserInfo = async (userId, asanaInfo) => {
  const { access_token, refresh_token, expires_in } = asanaInfo;
  const { gid, name, email } = asanaInfo.data;

  try {
    let asanaUser = await AsanaUser.findOne({ userId });

    if (!asanaUser) {
      asanaUser = new AsanaUser({
        userId,
        asanaKey: gid,
        name,
        email,
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiredAt: new Date(new Date().getTime() + expires_in * 1000),
      });

      await asanaUser.save();
    } else {
      asanaUser.accessToken = access_token;
      asanaUser.refreshToken = refresh_token;
      asanaUser.tokenExpiredAt = new Date(
        new Date().getTime() + expires_in * 1000
      );

      await asanaUser.save();
    }

    let workspace = await AsanaWorkspace.findOne({ asanaId: asanaUser._id });

    if (!workspace) {
      await saveUserWorkSpace(asanaUser._id, access_token);
    }
  } catch (error) {
    console.error("Asana user info error:", error);
  }
};
