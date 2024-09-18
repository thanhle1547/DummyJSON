const APIError = require('../utils/error');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  isAccessTokenEmpty,
} = require('../utils/jwt');
const {
  dataInMemory: frozenData,
  getUserPayload,
  isValidNumberInRange,
  findUserWithUsernameAndId,
  findUserWithUsername,
  findUserWithEmail,
  validateEmail,
} = require('../utils/util');
const { thirtyDaysInMints: maxTokenExpireTime } = require('../constants');
const {
  getAdminAuth,
  getUserCollectionRef,
  getAccountCollectionRef,
  getOrEqualityFilter,
} = require('../utils/firebase');
const { Filter, Timestamp, FieldValue } = require('firebase-admin/firestore');
const { generateOtp } = require('./otp');

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

// login user by username and password
controller.loginByUsernamePasswordOnFirebase = async data => {
  const { username, password, verification, expiresInMins = 60 } = data;

  if (!username || !password) {
    throw new APIError(`Username and password required`, 400);
  }

  if (!isValidNumberInRange(expiresInMins, 1, maxTokenExpireTime)) {
    throw new APIError(`maximum token expire time can be ${maxTokenExpireTime} minutes`);
  }

  const accountCollectionRef = getAccountCollectionRef(data);
  const userCollectionRef = getUserCollectionRef(data);

  const accountsQueryRes = await accountCollectionRef.where("username", "==", username).get();

  if (accountsQueryRes.empty) {
    throw new APIError(`Invalid credentials`, 400);
  }

  const accountDocumentSnapshot = accountsQueryRes.docs[0];
  const account = accountDocumentSnapshot.data();
  const accountId = account.id;

  if (!accountId) {
    throw new APIError(`Invalid credentials`, 400);
  }

  if (account.username != username || account.password != password) {
    throw new APIError(`Invalid credentials`, 400);
  }

  const usersQueryRes = await userCollectionRef.where("id", "==", accountId).get();
  if (usersQueryRes.empty) {
    throw new APIError(`Invalid credentials`, 400);
  }

  const userDocumentSnapshot = usersQueryRes.docs[0];
  const user = userDocumentSnapshot.data();

  if (!user) {
    throw new APIError(`Invalid credentials`, 400);
  }

  const isAccountVerified = account.isVerified;
  const isAccountNeedVerification = isAccountVerified !== undefined;

  if (isAccountNeedVerification === true) {
    let didOtpGenerated = false;
    await generateOtp({
      verification,
      userId: user.id,
      appName: data.appName,
      usedTo: 'login',
      expiresInMins,
      onGenerated: () => didOtpGenerated = true,
    });

    if (didOtpGenerated === true) {
      return {
        status: 'ok',
        result: true,
      };
    }
  }

  const payload = {
    "id": user.id ?? null,
    "name": user.name ?? null,
    "email": user.email ?? null,
    "phone": user.phone ?? null,
    "image": user.image ?? null,
  };

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

controller.getUserInfo = async data => {
  const { token } = data;

  try {
    if (!token) throw new APIError('Authentication Problem', 403);

    if (isAccessTokenEmpty(token)) {
      throw new APIError(`Invalid token`, 400);
    }

    const decoded = await verifyAccessToken(token);
    const user = findUserWithUsernameAndId(decoded);

    if (!user) {
      throw new APIError(`Invalid token`, 400);
    }

    return user;
  } catch (e) {
    throw e;
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
  const auth = getAdminAuth(data);

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
}

controller.loginSocial = async data => {
  const auth = getAdminAuth(data);

  const { token, expiresInMins = 60 } = data

  const decodedToken = await auth.verifyIdToken(token);

  const userCollectionRef = getUserCollectionRef(data);

  const payload = {
    "id": decodedToken.uid,
    "name": null,
    "email": decodedToken.email ?? null,
    "phone": decodedToken.phone_number ?? null,
    "image": decodedToken.picture ?? null,
  };

  const usersQueryRes = await userCollectionRef.where("id", "==", decodedToken.uid).get();
  if (usersQueryRes.empty) {
    await userCollectionRef.add(payload);
  } else {
    const documentSnapshot = usersQueryRes.docs[0];
    documentSnapshot.ref.update(payload);
  }

  const accessToken = await generateAccessToken(payload, expiresInMins);
  const refreshToken = await generateRefreshToken(payload, maxTokenExpireTime);

  return {
    ...payload,
    token: accessToken,
    refreshToken,
  };
}

controller.getUserInfoOnFirebase = async data => {
  const { token } = data;

  if (!token) throw new APIError('Authentication Problem', 403);

  if (isAccessTokenEmpty(token)) {
    throw new APIError(`Invalid token`, 400);
  }

  const decoded = await verifyAccessToken(token);

  const userId = decoded.id;

  if (!userId) {
    throw new APIError(`Invalid credentials`, 400);
  }

  const userCollectionRef = getUserCollectionRef(data);

  const usersQueryRes = await userCollectionRef.where("id", "==", userId).get();
  if (usersQueryRes.empty) {
    throw new APIError(`Invalid token`, 400);
  }

  const userDocumentSnapshot = usersQueryRes.docs[0];
  const user = userDocumentSnapshot.data();

  if (!user) {
    throw new APIError(`Invalid credentials`, 400);
  }

  return user;
};

// get new refresh token
controller.getNewRefreshTokenForFirebaseUser = async data => {
  const { refreshToken, expiresInMins = 60 } = data;

  if (!isValidNumberInRange(expiresInMins, 1, maxTokenExpireTime)) {
    throw new APIError(`maximum token expire time can be ${maxTokenExpireTime} minutes`);
  }

  if (!refreshToken) {
    throw new APIError(`Refresh token required`, 401);
  }

  let decodedToken;
  let userId;
  try {
    decodedToken = await verifyRefreshToken(refreshToken);
    userId = decodedToken.id;
  } catch (error) {
    throw new APIError(`Invalid refresh token`, 403);
  }

  let userCollectionRef;
  try {
    userCollectionRef = getUserCollectionRef(data);
  } catch (e) {
    throw getFirebaseAuthError(e);
  }

  const usersQueryRes = await userCollectionRef.where("id", "==", userId).get();
  if (usersQueryRes.empty) {
    throw new APIError(`Invalid refresh token`, 403);
  }

  const userDocumentSnapshot = usersQueryRes.docs[0];
  const user = userDocumentSnapshot.data();

  if (!user) {
    throw new APIError(`Invalid credentials`, 400);
  }

  const payload = {
    "id": user.id ?? null,
    "name": user.name ?? null,
    "email": user.email ?? null,
    "phone": user.phone ?? null,
    "image": user.image ?? null,
  };

  const newAccessToken = await generateAccessToken(payload);
  const newRefreshToken = await generateRefreshToken(payload, maxTokenExpireTime);

  return { token: newAccessToken, refreshToken: newRefreshToken };
};

controller.register = async data => {
  const { appName, username, password, email, verification, expiresInMins = 60 } = data;

  if (!username || !password || !email) {
    throw new APIError(`username, password and email are required`, 400);
  }

  if (!validateEmail(email)) {
    throw new APIError(`Invalid email`, 400);
  }

  const auth = getAdminAuth(data);

  const accountCollectionRef = getAccountCollectionRef(data);
  const userCollectionRef = getUserCollectionRef(data);

  const accountsQueryRes = await accountCollectionRef.where(
    Filter.or(
      Filter.where("username", "==", username),
      Filter.where("email", "==", email)
    )
  ).get();

  const users = frozenData.users.find(u => {
    const validUsername = u.username.toLowerCase() === username.toLowerCase();
    const validEmail = u.email === email;

    return validUsername || validEmail;
  });

  const accountPayload = {
    "username": username,
    "email": email ?? null,
    "password": password,
  };
  const userPayload = {
    "name": null,
    "email": email ?? null,
    "phone": null,
    "image": null,
  };

  let didOtpGenerated = false;
  if (accountsQueryRes.empty && (!users || users.length === 0)) {
    const user = await auth.createUser({
      email: email,
      password: password,
    });

    accountPayload.id = user.uid;
    userPayload.id = user.uid;

    await generateOtp({
      verification,
      userId: user.uid,
      appName: appName,
      usedTo: 'register',
      onGenerated: () => {
        accountPayload.isVerified = false;
        didOtpGenerated = true;
      },
    });

    await accountCollectionRef.add(accountPayload);
    await userCollectionRef.add(userPayload);
  } else {
    const accountDocumentSnapshot = accountsQueryRes.docs[0];
    const account = accountDocumentSnapshot?.data();
    const isAccountVerified = account?.isVerified;
    const isAccountNeedVerification = isAccountVerified !== undefined;
    const accountId = account?.id;

    if (isAccountNeedVerification === true && isAccountVerified === false && accountId) {
      await generateOtp({
        verification,
        // account id is user id, omit checking user is exists
        userId: accountId,
        appName: appName,
        usedTo: 'register',
        onGenerated: () => {
          didOtpGenerated = true;
        },
      });  
    } else {
      throw new APIError(`Invalid credentials`, 400);
    }
  }

  if (didOtpGenerated === true) {
    return {
      status: 'ok',
      result: true,
    };
  }

  const accessToken = await generateAccessToken(userPayload, expiresInMins);
  const refreshToken = await generateRefreshToken(userPayload, maxTokenExpireTime);

  return {
    ...userPayload,
    token: accessToken,
    refreshToken,
  };
};

controller.isUsernameExisted = async data => {
  const { username } = data;

  if (!username) {
    throw new APIError(`username required`, 400);
  }

  const accountCollectionRef = getAccountCollectionRef(data);

  const accountsQueryRes = await accountCollectionRef.where("username", "==", username).get();
  const users = findUserWithUsername(username);

  if (accountsQueryRes.empty && (!users || users.length === 0)) {
    return false;
  }

  return true;
};

controller.isEmailExisted = async data => {
  const { email } = data;

  if (!email) {
    throw new APIError(`email required`, 400);
  }

  if (!validateEmail(email)) {
    throw new APIError(`Invalid email`, 400);
  }

  const auth = getAdminAuth(data);

  try {
    const authUser = await auth.getUserByEmail(email);
    
    return true;
  } catch (error) {
    // No opt.
  }

  const accountCollectionRef = getAccountCollectionRef(data);
  const accountsQueryRes = await accountCollectionRef.where("email", "==", email).get();
  const users = findUserWithEmail(email);

  if (accountsQueryRes.empty && (!users || users?.length === 0)) {
    return false;
  }

  return true;
};

controller.forgotPassword = async data => {
  const { appName, username, email, verification } = data;

  if (!username && !email) {
    throw new APIError(`Neither username nor email are provided`, 400);
  }

  if (email && !validateEmail(email)) {
    throw new APIError(`Invalid email`, 400);
  }

  const accountCollectionRef = getAccountCollectionRef(data);
  const accountsQueryRes = await accountCollectionRef.where(
    getOrEqualityFilter({
      username, email
    }),
  ).get();

  if (accountsQueryRes.empty) {
    throw new APIError(`Invalid credentials`, 400);
  }

  const documentSnapshot = accountsQueryRes.docs[0];
  const account = documentSnapshot.data();
  const accountId = account.id;

  let didOtpGenerated = false;

  await generateOtp({
    verification,
    userId: accountId,
    appName: appName,
    usedTo: 'reset password',
    onGenerated: () => {
      didOtpGenerated = true;
    },
  });

  if (didOtpGenerated === false) {
    throw new APIError(`Invalid verification`, 400);
  }

  return {
    status: 'ok',
    result: true,
  };
};

controller.resetPassword = async data => {
  const { username, email, password } = data;

  if (!username && !email) {
    throw new APIError(`Neither username nor email are provided`, 400);
  }

  if (email && !validateEmail(email)) {
    throw new APIError(`Invalid email`, 400);
  }

  const accountCollectionRef = getAccountCollectionRef(data);
  const accountsQueryRes = await accountCollectionRef.where(
    getOrEqualityFilter({
      username, email
    }),
  ).get();

  if (accountsQueryRes.empty) {
    throw new APIError(`Invalid credentials`, 400);
  }

  const accountDocumentSnapshot = accountsQueryRes.docs[0];
  const accountDocumentRef = accountDocumentSnapshot.ref;
  const account = accountDocumentSnapshot.data();
  const passwordResetExpireTime = account.passwordResetExpireTime;

  if (!passwordResetExpireTime) {
    throw new APIError("Invalid request", 400);
  }

  const currentTime = Timestamp.now();

  if (currentTime > passwordResetExpireTime) {
    await accountDocumentRef.update({
      "passwordResetExpireTime": FieldValue.delete(),
    });

    throw new APIError("Request to reset password has expired. Please try again later.", 429);
  }

  await accountDocumentRef.update({
    "password": password,
    "passwordResetExpireTime": FieldValue.delete(),
  });

  return {
    status: 'ok',
    result: true,
  };
};

controller.changePassword = async data => {
  const { token, oldPassword, newPassword } = data;

  if (!token) throw new APIError('Authentication Problem', 403);

  if (isAccessTokenEmpty(token)) {
    throw new APIError(`Invalid token`, 400);
  }

  const decoded = await verifyAccessToken(token);

  const userId = decoded.id;

  if (!userId) {
    throw new APIError(`Invalid credentials`, 400);
  }

  const accountCollectionRef = getAccountCollectionRef(data);
  const accountsQueryRes = await accountCollectionRef.where("id", "==", userId).get();

  if (accountsQueryRes.empty) {
    throw new APIError(`Invalid credentials`, 400);
  }

  const accountDocumentSnapshot = accountsQueryRes.docs[0];
  const accountDocumentRef = accountDocumentSnapshot.ref;
  const account = accountDocumentSnapshot.data();
  const currentPassword = account.password;

  if (currentPassword !== oldPassword) {
    throw new APIError("Invalid oldPassword", 400);
  }

  await accountDocumentRef.update({
    "password": newPassword,
  });

  return {
    status: 'ok',
    result: true,
  };
};

module.exports = controller;
