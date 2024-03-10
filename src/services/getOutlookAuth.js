const msal = require("@azure/msal-node");
const crypto = require("crypto");

function generateCodeVerifier() {
  return crypto.randomBytes(32).toString("hex");
}

function generateCodeChallenge(codeVerifier) {
  return crypto.createHash("sha256").update(codeVerifier).digest("base64url");
}

let codeVerifier;

const msalConfig = {
  auth: {
    clientId: process.env.MICROSOFT_WEB_CLIENT_ID,
    authority: process.env.MICROSOFT_AUTHORITY,
    clientSecret: process.env.MICROSOFT_WEB_CLIENT_SECRET,
    redirectUri: process.env.AUTH_REDIRECT_URI_OUTLOOK,
  },
};
const pca = new msal.ConfidentialClientApplication(msalConfig);

exports.getOutlookAuthUrl = async () => {
  codeVerifier = generateCodeVerifier();

  const codeChallenge = generateCodeChallenge(codeVerifier);
  const authCodeUrlParameters = {
    scopes: [
      "openid",
      "profile",
      "User.read",
      "Calendars.Readwrite",
      "MailboxSettings.Read",
    ],
    redirectUri: process.env.AUTH_REDIRECT_URI_OUTLOOK,
    codeChallenge,
    codeChallengeMethod: "S256",
  };

  try {
    const authResponse = await pca.getAuthCodeUrl(authCodeUrlParameters);

    return authResponse;
  } catch (error) {
    console.log("Outlook login error:", error);

    throw error;
  }
};

exports.outlookLogin = async (code) => {
  const tokenRequest = {
    code,
    scopes: [
      "openid",
      "profile",
      "User.Read",
      "Calendars.ReadWrite",
      "MailboxSettings.Read",
    ],
    redirectUri: process.env.AUTH_REDIRECT_URI_OUTLOOK,
    codeVerifier,
  };

  try {
    const response = await pca.acquireTokenByCode(tokenRequest);

    return response;
  } catch (error) {
    console.log("Outlook login error:", error);

    throw error;
  }
};
