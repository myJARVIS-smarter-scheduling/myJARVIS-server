const { getOutlookAuthUrl } = require("../services/getOutlookAuth");
const { getGoogleAuthUrl } = require("../services/getGoogleAuth");

exports.googleAuthHandler = async (req, res, next) => {
  const googleAuthUrl = getGoogleAuthUrl();

  res.status(200).send({ url: googleAuthUrl });
};

exports.outlookAuthHandler = async (req, res, next) => {
  const outlookAuthUrl = await getOutlookAuthUrl();

  // TODO. 배포 이후 HTTPS 사용시에는 해당 주석을 활성화합니다.
  // TODO. 주석 활성화 이후 SameSite쿠키 활성화를 통해 ThirdParty Cookie 문제를 해결합니다.
  // res.cookie("name", "value", { sameSite: "none", secure: true });
  // res.status(200).json({ url: outlookAuthUrl });
  res.redirect(outlookAuthUrl);
};
