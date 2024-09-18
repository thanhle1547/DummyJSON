const { Timestamp, FieldValue } = require("firebase-admin/firestore");
const Randomstring = require("randomstring");
const {
  getOtpCollectionRef,
  getAccountCollectionRef,
  getUserCollectionRef,
  getOrEqualityFilter,
} = require("../utils/firebase");
const { fiveMints: maxOtpExpireTime, oneHour: passwordResetExpireTime } = require("../constants");
const APIError = require("../utils/error");
const { thirtyDaysInMints: maxTokenExpireTime } = require('../constants');
const { generateAccessToken, generateRefreshToken } = require("../utils/jwt");

const controller = {};

function generateCode(type) {
  if (type === '4 digit OTP') {
    return Randomstring.generate({
      length: 4,
      charset: 'numeric',
    });
  } else if (type === '6 digit OTP') {
    return Randomstring.generate({
      length: 6,
      charset: 'numeric',
    });
  } else {
    return undefined;
  }
}

controller.generateOtp = async options => {
  const { verification: type, usedTo, userId, onGenerated } = options;

  const code = generateCode(type);

  if (code === undefined) return;

  onGenerated();

  const otpCollectionRef = getOtpCollectionRef(options);

  let otpDocumentRef;
  let attemptCount = 1;

  const otpsQueryRes = await otpCollectionRef.where("userId", "==", userId).get();
  if (!otpsQueryRes.empty) {
    const documentSnapshot = otpsQueryRes.docs[0];
    otpDocumentRef = documentSnapshot.ref;

    const otp = documentSnapshot.data();

    const isLocked = otp.lock;
    const lockTimeout = otp.timeout;
    attemptCount = otp.attempts + 1;

    if (isLocked === true) {
      const currentTime = Timestamp.now();
      if (currentTime <= lockTimeout) {
        throw new APIError("Exceeded maximum OTP attempts. Please try again later.", 429);
      } else {
        attemptCount = 1;
      }
    }
  
    if (attemptCount >= 5) {
      await otpDocumentRef.update({
        "lock": true,
        "timeout": Timestamp.fromDate(
          new Date(Date.now() + (maxOtpExpireTime * 60000))
        ),
      });
      throw new APIError("Exceeded maximum OTP attempts. Please try again later.", 429);
    }
  }

  const otpPayload = {
    "userId": userId,
    "code": code,
    "usedTo": usedTo,
    "attempts": attemptCount,
    "expiryTime": Timestamp.fromDate(
      new Date(Date.now() + (maxOtpExpireTime * 60000))
    ),
  };

  if (otpDocumentRef === undefined) {
    await otpCollectionRef.add(otpPayload);
  } else {
    await otpDocumentRef.set(otpPayload);
  }
};

controller.verifyOtp = async data => {
  const { username, email, enteredOtp, expiresInMins = 60 } = data;

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
  const accountId = account.id;
  const isAccountVerified = account.isVerified;
  const isAccountNeedVerification = isAccountVerified !== undefined;

  if (!accountId) {
    throw new APIError(`Invalid credentials`, 400);
  }

  if (isAccountNeedVerification === false) {
    throw new APIError("Invalid request", 400);
  }

  const otpCollectionRef = getOtpCollectionRef(data);

  const otpsQueryRes = await otpCollectionRef.where("userId", "==", accountId).get();
  if (otpsQueryRes.empty) {
    throw new APIError("Invalid request", 400);
  }

  const otpDocumentSnapshot = otpsQueryRes.docs[0];
  const otpDocumentRef = otpDocumentSnapshot.ref;
  const otp = otpDocumentSnapshot.data();

  const currentTime = Timestamp.now();
  const expiryTime = otp.expiryTime;

  if (currentTime > expiryTime) {
    await otpDocumentRef.update({
      "expiryTime": FieldValue.delete(),
    });

    throw new APIError("OTP has expired. Please try again later.", 429);
  }

  const attemptCount = otp.attempts;

  if (attemptCount >= 5) {
    await otpDocumentRef.update({
      "lock": true,
      "timeout": Timestamp.fromDate(
        new Date(Date.now() + (maxOtpExpireTime * 60000))
      ),
    });
    throw new APIError("Exceeded maximum OTP attempts. Please try again later.", 429);
  }

  const storedCode = otp.code;

  if (!storedCode || storedCode !== enteredOtp) {
    await otpDocumentRef.update({
      "attempts": attemptCount + 1,
    });
    throw new APIError("Invalid OTP", 400);
  }

  await otpDocumentRef.delete();
  if (otp.usedTo === 'register') {
    accountDocumentRef.delete();
  }

  if (isAccountNeedVerification) {
    await accountDocumentRef.update({
      isVerified: true,
    });
  }

  const userCollectionRef = getUserCollectionRef(data);

  const usersQueryRes = await userCollectionRef.where("id", "==", accountId).get();
  if (usersQueryRes.empty) {
    throw new APIError(`Invalid credentials`, 400);
  }

  const documentSnapshot = usersQueryRes.docs[0];
  const user = documentSnapshot.data();

  if (!user) {
    throw new APIError(`Invalid credentials`, 400);
  }

  if (otp.usedTo === 'reset password') {
    await accountDocumentRef.update({
      passwordResetExpireTime: Timestamp.fromDate(
        new Date(Date.now() + (passwordResetExpireTime * 60000))
      ),
    });

    return {
      status: 'ok',
      result: true,
    };
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
}

module.exports = controller;
