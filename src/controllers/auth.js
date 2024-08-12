const APIError = require('../utils/error');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const {
  dataInMemory: frozenData,
  getUserPayload,
  isValidNumberInRange,
  findUserWithUsernameAndId,
} = require('../utils/util');
const { thirtyDaysInMints: maxTokenExpireTime } = require('../constants');
const getApp = require('./firebase_app');

const controller = {};

// login user by username and password
controller.loginByUsernamePassword = async data => {
  const { username, password, expiresInMins = 60 } = data;

  if (!username || !password) {
    throw new APIError(`Username and password required`, 400);
  }

  if (!isValidNumberInRange(expiresInMins, 1, maxTokenExpireTime)) {
    throw new APIError(`maximum token expire time can be ${maxTokenExpireTime} minutes`);
  }

  const user = frozenData.users.find(u => {
    const validUsername = u.username.toLowerCase() === username.toLowerCase();
    const validPassword = u.password === password;

    return validUsername && validPassword;
  });

  if (!user) {
    throw new APIError(`Invalid credentials`, 400);
  }

  const payload = getUserPayload(user);

  try {
    const token = await generateAccessToken(payload, expiresInMins);
    const refreshToken = await generateRefreshToken(payload, maxTokenExpireTime);

    return {
      ...payload,
      token,
      refreshToken,
    };
  } catch (err) {
    throw new APIError(err.message, 400);
  }
};

// get new refresh token
controller.getNewRefreshToken = async data => {
  const { refreshToken, expiresInMins = 60 } = data;

  if (!isValidNumberInRange(expiresInMins, 1, maxTokenExpireTime)) {
    throw new APIError(`maximum token expire time can be ${maxTokenExpireTime} minutes`);
  }

  if (!refreshToken) {
    throw new APIError(`Refresh token required`, 401);
  }

  let user;

  try {
    const decoded = await verifyRefreshToken(refreshToken);
    user = findUserWithUsernameAndId(decoded);
  } catch (error) {
    throw new APIError(`Invalid refresh token`, 403);
  }

  if (!user) {
    throw new APIError(`Refresh token expired`, 403);
  }

  const payload = getUserPayload(user);

  const newAccessToken = await generateAccessToken(payload);
  const newRefreshToken = await generateRefreshToken(payload, maxTokenExpireTime);

  return { token: newAccessToken, refreshToken: newRefreshToken };
};

controller.getSingleFirebaseUsers = async data => {
  const { appName } = data;

  if (appName === undefined) {
    throw new APIError('App name required', 401);
  }

  const app = getApp(appName);

  if (app === undefined) {
    throw new APIError('Missing Firebase Credentials', 401);
  }

  const auth = app.auth();

  try {
    const result = await auth.listUsers(1);

    const users = result.users;

    if (users.length === 0) return null;

    const user = users[0];

    return {
      "id": user.uid,
      "name": user.displayName,
      "email": user.email,
      "phone": user.phoneNumber,
      "image": user.photoURL,
    };
  } catch (e) {
    const message = e.message;

    const rawResponseText = 'Raw server response: ';
    const rawResponseIndex = message.indexOf(rawResponseText);
    if (rawResponseIndex !== -1) {
      const rawResponse = message.substring(rawResponseIndex + rawResponseText.length + 1, message.length - 1);
      const response = JSON.parse(rawResponse);

      throw new APIError(response.error.message, response.error.code);
    }

    throw e;
  }
}

module.exports = controller;
