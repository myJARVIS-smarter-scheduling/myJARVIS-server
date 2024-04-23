const axios = require("axios");

const { AsanaUser, User } = require("../models/AsanaUser");
const { getAsanaTokens } = require("../services/getAsanaAuth");
const { saveAsanaUserInfo } = require("../services/saveUserInfo");

exports.getAsanaUser = async (req, res, next) => {
  const { code } = req.query;
  const { userId } = req.cookies;

  try {
    const response = await getAsanaTokens(code);

    await saveAsanaUserInfo(userId, response);

    res.redirect(process.env.ASANA_TASK_REDIRECT_URL);
  } catch (error) {
    console.error(error);

    next(error);
  }
};
