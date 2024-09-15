const router = require('express').Router();
const path = require('path');
const { capitalize, isDev } = require('../utils/util');

const {
  GOOGLE_TAG_ID,
  GOOGLE_PUBLISHER_ID,
  PORT = 8888,
} = process.env;

const {
  LOCAL_TEST_FIREBASE_ID,
  LOCAL_TEST_FIREBASE_API_KEY,
  LOCAL_TEST_FIREBASE_AUTH_DOMAIN,
  LOCAL_TEST_FIREBASE_DATABASE_URL,
  LOCAL_TEST_FIREBASE_PROJECT_ID,
  LOCAL_TEST_FIREBASE_STORAGE_BUCKET,
  LOCAL_TEST_FIREBASE_MESSAGING_SENDER_ID,
  LOCAL_TEST_FIREBASE_APP_ID,
  LOCAL_TEST_FIREBASE_MEASUREMENT_ID,
} = process.env;

const commonVariables = {
  googleTagId: GOOGLE_TAG_ID,
  googlePublisherId: GOOGLE_PUBLISHER_ID,
  localhostPort: PORT,
  localTestFirebaseId: LOCAL_TEST_FIREBASE_ID,
};

const localTestVariables = {
  localTestFirebaseApiKey: LOCAL_TEST_FIREBASE_API_KEY,
  localTestFirebaseAuthDomain: LOCAL_TEST_FIREBASE_AUTH_DOMAIN,
  localTestFirebaseDatabaseURL: LOCAL_TEST_FIREBASE_DATABASE_URL,
  localTestFirebaseProjectId: LOCAL_TEST_FIREBASE_PROJECT_ID,
  localTestFirebaseStorageBucket: LOCAL_TEST_FIREBASE_STORAGE_BUCKET,
  localTestFirebaseMessagingSenderId: LOCAL_TEST_FIREBASE_MESSAGING_SENDER_ID,
  localTestFirebaseAppId: LOCAL_TEST_FIREBASE_APP_ID,
  localTestFirebaseMeasurementId: LOCAL_TEST_FIREBASE_MEASUREMENT_ID,
};

const availableResources = [
  'products',
  'carts',
  'users',
  'posts',
  'comments',
  'image',
  'todos',
  'quotes',
  'recipes',
  'auth',
  'http',
];

const availableLocalResources = [
  'login-test',
];

router.get('/', (req, res) => {
  res.render('index', { ...commonVariables });
});

router.get('/docs', (req, res) => {
  res.render('docs', {
    ...commonVariables,
    page: '',
    description: `DummyJSON provides a fake REST API of JSON data for development, testing, and prototyping. Quickly get realistic data for your front-end projects.`,
  });
});

router.get('/docs/:resource', (req, res, next) => {
  const resource = (req.params.resource || '').toLowerCase();

  if (!availableResources.includes(resource)) {
    next();
    return;
  }

  const capitalizedResource = capitalize(resource);

  let variables = commonVariables;
  if (isDev) {
    variables = Object.assign({}, variables, localTestVariables);
  }

  res.render(`docs-${resource}`, {
    ...variables,
    page: capitalizedResource,
    description: `REST Endpoints filled with ${capitalizedResource} JSON data, DummyJSON provides a fake REST API of JSON data for development, testing, and prototyping. Quickly get realistic data for your front-end projects.`,
  });
});

router.get('/custom-response', (req, res) => {
  res.render('custom-response', {
    ...commonVariables,
  });
});

router.get('/local/:resource', (req, res, next) => {
  const resource = (req.params.resource || '').toLowerCase();

  if (!availableLocalResources.includes(resource)) {
    next();
    return;
  }

  const capitalizedResource = capitalize(resource);

  res.render(`local-${resource}`, {
    ...commonVariables,
    ...localTestVariables,
    isLocal: true,
    page: capitalizedResource,
    description: `REST Endpoints filled with ${capitalizedResource} JSON data, DummyJSON provides a fake REST API of JSON data for development, testing, and prototyping. Quickly get realistic data for your front-end projects.`,
  });
});

router.get('/robots.txt', (req, res) => {
  res.sendFile(path.join(__dirname, '../../', 'public', 'robots.txt'));
});

router.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, '../../', 'public', 'favicon.ico'));
});

module.exports = router;
