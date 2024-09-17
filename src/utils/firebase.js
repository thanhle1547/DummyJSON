const APIError = require('../utils/error');
const { verifyAdmim } = require('../helpers');
const { Query, Filter } = require('firebase-admin/firestore');

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

firebase.getOtpCollectionRef = data => {
  const firestore = getAdminFirestore(data);
  return firestore.collection('otp');
}

/**
 * Used to refine the results of a {@link Query}.
 * @returns {Filter} The created {@link Filter}.
 */
firebase.getOrEqualityFilter = data => {
  const filters = [];

  for (const key in data) {
    if (data[key] === undefined) continue;

    filters.push(
      Filter.where(key, "==", data[key]),
    );
  }

  if (filters.length == 1) {
    return filters[0];
  }

  return Filter.or(filters);
}

module.exports = firebase;