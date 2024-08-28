const APIError = require('../utils/error');
const { verifyAdmim } = require('../helpers');

const firebase = {};

firebase.maybeGetAdminAuth = data => {
  const { appName } = data;

  if (appName == undefined) return undefined;

  return verifyAdmim(appName).auth();
}

firebase.getAdminAuth = data => {
  const { appName } = data;

  return verifyAdmim(appName).auth();
}

function getAdminFirestore(data) {
  const { appName } = data;

  return verifyAdmim(appName).firestore();
}

firebase.getAdminFirestore = getAdminFirestore;

firebase.getUserCollectionRef = data => {
  const firestore = getAdminFirestore(data);
  return firestore.collection('user');
}

firebase.getFirebaseAuthError = e => {
  if (e instanceof APIError) {
    return e;
  }

  const message = e.message;

  const rawResponseText = 'Raw server response: ';
  const rawResponseIndex = message.indexOf(rawResponseText);
  if (rawResponseIndex !== -1) {
    const rawResponse = message.substring(rawResponseIndex + rawResponseText.length + 1, message.length - 1);
    const response = JSON.parse(rawResponse);

    return new APIError(response.error.message, response.error.code);
  }

  const wrongFirebaseText = 'Firebase ID token has incorrect "aud" (audience) claim. Expected';
  if (message.startsWith(wrongFirebaseText)) {
    return new APIError('Wrong Firebase', 500);
  }

  const details = e.details;
  const cloudFirestoreDisabledText = 'Cloud Firestore API has not been used in project ';
  if (details !== undefined && details.startsWith(cloudFirestoreDisabledText)) {
    return new APIError('Cloud Firestore has not been used or it is disabled', 500);
  }

  const invalidIdTokenText = 'Firebase ID token has no "kid" claim';
  if (message.startsWith(invalidIdTokenText)) {
    return new APIError(`Invalid token`, 400);
  }

  return e;
}

module.exports = firebase;