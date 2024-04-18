const { URL, URLSearchParams } = require("url");

const { getGoogleAuthUrl } = require("../services/getGoogleAuth");

exports.googleAuthHandler = async (req, res, next) => {
  const googleAuthUrl = getGoogleAuthUrl();

  res.redirect(googleAuthUrl);
};

exports.asanaAuthHandler = async (req, res, next) => {
  const asanaAuthBaseUrl = new URL("https://app.asana.com/-/oauth_authorize");

  const params = new URLSearchParams({
    client_id: process.env.ASANA_CLIENT_ID,
    redirect_uri: process.env.AUTH_REDIRECT_URI_ASANA,
    response_type: "code",
    state: process.env.ASANA_STATE_SECRET,
  });

  asanaAuthBaseUrl.search = params.toString();
  console.log(asanaAuthBaseUrl.toString());

  res.redirect(asanaAuthBaseUrl.toString());
};

exports.googleLogout = async (req, res, next) => {
  res.clearCookie("userId");
  res.clearCookie("accessToken");

  res.redirect("/");
};
