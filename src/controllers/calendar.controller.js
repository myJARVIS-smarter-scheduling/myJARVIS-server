const { googleLogin } = require("../services/getGoogleAuth");
const {
  getGoogleUserInfo,
  getOutlookUserInfo,
} = require("../services/getUserInfo");
const {
  getGoogleCalendarEvents,
  getOutlookCalendarEvents,
} = require("../services/getCalendarEvents");
const { saveCalendarEvents } = require("../services/saveCalendarEvents");
const { User, Account } = require("../models/User");
const { Event } = require("../models/Event");

// TODO. 추후 유저정보 저장과 캘린더정보 저장 로직을 분리합니다.
// NOTE. msal 인스턴스 캐싱 이슈로 인해 마이크로소프트 인증은 클라이언트로 이동합니다.
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
      res.cookie(
        "accessToken",
        user.accessToken,
        {},
        {
          httpOnly: true,
          secure: true,
          expires: user.tokenExpiredAt,
        },
      );
      res.cookie(
        "userId",
        user._id.toString(),
        {},
        {
          httpOnly: true,
          secure: true,
          expires: user.tokenExpiredAt,
        },
      );
    }

    res.redirect(process.env.HOME_REDIRECT_URL);
  } catch (error) {
    console.error("google calendar controller error:", error);
  }
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
    const userInfo = { email: user.email, timezone: user.timezone };

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
