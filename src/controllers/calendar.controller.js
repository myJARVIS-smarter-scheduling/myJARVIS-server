const { googleLogin } = require("../services/getGoogleAuth");
const { outlookLogin } = require("../services/getOutlookAuth");
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

exports.googleCalendarHandler = async (req, res, next) => {
  const { code } = req.query;

  try {
    const { tokens } = await googleLogin(code);
    const { email, name, timezone, language } = await getGoogleUserInfo(
      tokens.access_token,
    );

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        email,
        name,
        timezone,
        language,
      });

      await user.save();
    }

    let account = await Account.findOne({
      userId: user._id,
      email,
      provider: "google",
    });

    if (!account) {
      account = new Account({
        userId: user._id,
        provider: "google",
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

    // TODO. 클라이언트에 이벤트 목록을 보내주는 로직이 추후 필요합니다.
    await user.save();

    res.redirect(process.env.HOME_REDIRECT_URL);
  } catch (error) {
    console.error("google calendar controller error:", error);
  }
};

exports.outlookCalendarHandler = async (req, res, next) => {
  const { code } = req.query;

  try {
    const outlookTokenInfo = await outlookLogin(code);
    const { email, name, timezone, language } = await getOutlookUserInfo(
      outlookTokenInfo.accessToken,
    );

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        email,
        name,
        timezone,
        language,
      });

      await user.save();
    }

    let account = await Account.findOne({
      userId: user._id,
      email,
      provider: "outlook",
    });

    if (!account) {
      account = new Account({
        userId: user._id,
        provider: "outlook",
        email,
        accessToken: outlookTokenInfo.accessToken,
        refreshToken: outlookTokenInfo.refreshOn,
        tokenExpiredAt: new Date(
          new Date().getTime() + outlookTokenInfo.expiresOn * 1000,
        ),
      });

      await account.save();

      user.accountList.push(account);
    } else {
      account.accessToken = outlookTokenInfo.accessToken;
      account.refreshToken = outlookTokenInfo.refreshOn;
      account.tokenExpiredAt = new Date(
        new Date().getTime() + outlookTokenInfo.expiresOn * 1000,
      );

      await account.save();
    }

    const eventList = await getOutlookCalendarEvents(account.accessToken);

    if (eventList.length > 0) {
      await saveCalendarEvents(
        account._id,
        eventList,
        account.provider,
        timezone,
      );
    }

    // TODO. 클라이언트에 이벤트 목록을 보내주는 로직이 추후 필요합니다.
    await user.save();

    res.redirect(process.env.HOME_REDIRECT_URL);
  } catch (error) {
    console.error("outlook calendar controller error:", error);
  }
};
