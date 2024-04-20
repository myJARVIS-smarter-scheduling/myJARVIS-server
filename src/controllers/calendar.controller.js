const { googleLogin } = require("../services/getGoogleAuth");
const { getGoogleUserInfo } = require("../services/getUserInfo");
const { getGoogleCalendarEvents } = require("../services/getCalendarEvents");
const { saveCalendarEvents } = require("../services/saveCalendarEvents");
const {
  setupGoogleWebhook,
  setupMicrosoftWebhook,
} = require("../services/subscribeWebhooks");
const { User, Account } = require("../models/User");
const { Event } = require("../models/Event");

exports.saveGoogleUserAndCalendar = async (req, res, next) => {
  const { code } = req.query;
  const { userId } = req.cookies;

  try {
    const { tokens } = await googleLogin(code);
    const { email, name, timezone, language } = await getGoogleUserInfo(
      tokens.access_token,
      tokens.refresh_token,
    );

    let user = await User.findOne({ email });
    const loginUser = await User.findById(userId);
    const provider = "google";

    if (!userId && !user) {
      user = new User({
        email,
        name,
        timezone,
        language,
        provider,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiredAt: new Date(
          new Date().getTime() + tokens.expires_in * 1000,
        ),
      });

      await user.save();
    } else if (!userId && user) {
      user.accessToken = tokens.access_token;
      user.refreshToken = tokens.refresh_token;
      user.tokenExpiredAt = new Date(
        new Date().getTime() + tokens.expires_in * 1000,
      );

      await user.save();
    } else {
      user = loginUser;
    }

    let account = await Account.findOne({
      userId: user._id,
      email,
      provider,
    });

    if (!account) {
      account = new Account({
        userId: user._id,
        provider,
        email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiredAt: new Date(
          new Date().getTime() + tokens.expires_in * 1000,
        ),
      });

      await account.save();
      await setupGoogleWebhook(account._id, account.accessToken);

      user.accountList.push(account);
    } else {
      account.accessToken = tokens.access_token;
      account.refreshToken = tokens.refresh_token;
      account.tokenExpiredAt = new Date(
        new Date().getTime() + tokens.expires_in * 1000,
      );

      await account.save();
    }

    const eventList = await getGoogleCalendarEvents(tokens.access_token);

    if (eventList.length > 0) {
      await saveCalendarEvents(
        account._id,
        eventList,
        account.provider,
        user.timezone,
      );
    }

    await user.save();

    if (!userId) {
      res.cookie("accessToken", user.accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        expires: new Date(Date.now() + 60 * 60 * 24 * 7 * 1000),
      });
      res.cookie("userId", user._id.toString(), {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        expires: new Date(Date.now() + 60 * 60 * 24 * 7 * 1000),
      });
    }

    res.redirect(process.env.HOME_REDIRECT_URL);
  } catch (error) {
    console.error("google calendar controller error:", error);
  }
};

exports.saveOutlookUserAndCalendar = async (req, res, next) => {
  const { userId } = req.cookies;
  const { accountsData } = req.body;
  const { userInfo, mailboxSettings, calendarEvents, accessToken } =
    accountsData[accountsData.length - 1];
  const email = userInfo.mail;

  let user = await User.findOne({ email });
  const loginUser = await User.findById(userId);
  const provider = "microsoft";

  if (!user && !userId) {
    user = new User({
      email,
      name: userInfo.displayName,
      timezone: mailboxSettings.timeZone,
      language: mailboxSettings.locale,
      provider,
      accessToken,
    });

    await user.save();
  } else if (!userId && user) {
    user.accessToken = accessToken;

    await user.save();
  } else {
    user = loginUser;
  }

  let account = await Account.findOne({
    userId: user._id,
    email,
    provider,
  });

  if (!account) {
    account = new Account({
      userId: user._id,
      provider,
      email,
      accessToken,
    });

    await account.save();
    await setupMicrosoftWebhook(account._id, account.accessToken);

    user.accountList.push(account);
  } else {
    account.accessToken = accessToken;

    await account.save();
  }

  if (calendarEvents.value.length > 0) {
    await saveCalendarEvents(
      account._id,
      calendarEvents.value,
      account.provider,
      user.timezone,
    );
  }

  await user.save();

  if (!userId) {
    res.cookie("accessToken", user.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      expires: new Date(Date.now() + 60 * 60 * 24 * 7 * 1000),
    });
    res.cookie("userId", user._id.toString(), {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      expires: new Date(Date.now() + 60 * 60 * 24 * 7 * 1000),
    });
  }

  const eventPromiseList = user.accountList.map(async (accountdata) => {
    const events = await Event.find({ accountId: accountdata._id });

    return { accountId: accountdata._id, email: accountdata.email, events };
  });

  const accountEventList = await Promise.all(eventPromiseList);
  const accountInfo = {
    email: user.email,
    provider: user.provider,
    timezone: user.timezone,
  };

  return res.status(201).json({
    result: "success",
    accountEventList,
    user: accountInfo,
  });
};

exports.transferCalendarEvents = async (req, res, next) => {
  const { userId } = req.cookies;

  try {
    const user = await User.findById(userId).populate({
      path: "accountList",
      model: "Account",
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const eventPromiseList = user.accountList.map(async (account) => {
      const events = await Event.find({ accountId: account._id });

      return { accountId: account._id, email: account.email, events };
    });

    const accountEventList = await Promise.all(eventPromiseList);
    const userInfo = {
      email: user.email,
      provider: user.provider,
      timezone: user.timezone,
    };

    return res.status(200).json({
      result: "success",
      accountEventList,
      user: userInfo,
    });
  } catch (error) {
    console.error("sendEvents error:", error);

    return res.status(500).json({ message: "Server error" });
  }
};
