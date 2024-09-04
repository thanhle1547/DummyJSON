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

firebase.getAccountCollectionRef = data => {
  const firestore = getAdminFirestore(data);
  return firestore.collection('account');
}

module.exports = firebase;