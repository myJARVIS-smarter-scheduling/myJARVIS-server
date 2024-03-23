const { User, Account } = require("../models/User");
const { AsanaUser } = require("../models/AsanaUser");

// TODO. 하나의 저장 함수로 통합하고 분기처리 합니다.
exports.saveNewUserTokens = async (
  userId,
  newAccessToken,
  newRefreshToken,
  newTokenExpiredAt,
) => {
  try {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    user.accessToken = newAccessToken;
    user.refreshToken = newRefreshToken;
    user.tokenExpiredAt = newTokenExpiredAt;

    await user.save();

    console.log(`User(${user.email}) Token information updated successfully.`);
  } catch (error) {
    console.error("Error updating token information:", error);

    throw error;
  }
};

exports.saveNewAccountTokens = async (
  accountId,
  newAccessToken,
  newRefreshToken,
  newTokenExpiredAt,
) => {
  try {
    const account = await Account.findById(accountId);

    if (!account) {
      throw new Error("Account not found");
    }

    account.accessToken = newAccessToken;
    account.refreshToken = newRefreshToken;
    account.tokenExpiredAt = newTokenExpiredAt;

    await account.save();

    console.log(
      `Account(${account.email}) Token information updated successfully.`,
    );
  } catch (error) {
    console.error("Error updating token information:", error);

    throw error;
  }
};

exports.saveAsanaTokens = async (
  asanaId,
  newAccessToken,
  newRefreshToken,
  newTokenExpiredAt,
) => {
  try {
    const asanaUser = await AsanaUser.findById(asanaId);
    if (!asanaUser) {
      throw new Error("Asana user not found");
    }

    asanaUser.accessToken = newAccessToken;
    asanaUser.refreshToken = newRefreshToken;
    asanaUser.tokenExpiredAt = newTokenExpiredAt;

    await asanaUser.save();
  } catch (error) {
    console.error("Error updating asana token information:", error);

    throw error;
  }
};
