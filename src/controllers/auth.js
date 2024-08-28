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
} = require('../utils/util');
const { thirtyDaysInMints: maxTokenExpireTime } = require('../constants');
const { getAdminAuth, getUserCollectionRef, getFirebaseAuthError } = require('../utils/firebase');

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
  try {
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
  } catch (e) {
    throw getFirebaseAuthError(e);
  }
}

controller.loginSocial = async data => {
  try {
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

    const usersDocumentRef = await userCollectionRef.where("id", "==", decodedToken.uid).get();
    if (usersDocumentRef.empty) {
      await userCollectionRef.add(payload);
    } else {
      const documentSnapshot = usersDocumentRef.docs[0];
      documentSnapshot.ref.update(payload);
    }

    const accessToken = await generateAccessToken(payload, expiresInMins);
    const refreshToken = await generateRefreshToken(payload, maxTokenExpireTime);

    return {
      ...payload,
      accessToken,
      refreshToken,
    };
  } catch (e) {
    throw getFirebaseAuthError(e);
  }
}

controller.getUserInfoOnFirebase = async data => {
  const { token } = data;

  try {
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

    let user;

    const usersDocumentRef = await userCollectionRef.where("id", "==", userId).get();
    if (usersDocumentRef.empty) {
      throw new APIError(`Invalid token`, 400);
    } else {
      const documentSnapshot = usersDocumentRef.docs[0];
      user = documentSnapshot.data();
    }

    if (!user) {
      throw new APIError(`Invalid credentials`, 400);
    }

    return user;
  } catch (e) {
    throw getFirebaseAuthError(e);
  }
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

  let user;

  const usersDocumentRef = await userCollectionRef.where("id", "==", userId).get();
  if (usersDocumentRef.empty) {
    throw new APIError(`Invalid refresh token`, 403);
  } else {
    const documentSnapshot = usersDocumentRef.docs[0];
    user = documentSnapshot.data();
  }

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

module.exports = controller;
