const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const setClientInfo = require('./set-client-info');
const requestLogger = require('./request-logger');
const cleanRequest = require('./clean-request');
const delayResponse = require('./delay-response');
const rateLimiter = require('./rate-limiter');
const wwwRedirect = require('./www-redirect');
const removeHeaders = require('./remove-headers');
const { isDev } = require('../utils/util');

// for parsing application/json
const expressJson = express.json({ limit: '300kb' });
// for parsing application/x-www-form-urlencoded
const expressUrlencoded = express.urlencoded({ extended: true, limit: '300kb' });

// allow cross-origin resource policy
const helmetConfig = {
  crossOriginResourcePolicy: false,
  // for testing social login and refresh on local
  crossOriginEmbedderPolicy: false,
  // crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
};

function injectMiddleWares(app) {
  app.set('trust proxy', 1);
  app.use(setClientInfo);
  app.use(rateLimiter);

  // use helmet JS.
  //
  // Helmet is a package that adds content-security-policies
  // and response headers to your API replies.
  // The content-security-policy header was set to a default value,
  // which contained a CSP header of "upgrade-insecure-requests."
  //
  // Helmet is a package that helps protect your server from
  // some well-known web vulnerabilities by setting HTTP
  // response headers appropriately.
  //
  // Some security attacks help secure your express server
  // from common attacks such as clickjacking, and
  // cross-site scripting attacks,
  // it also helps enforce secure HTTPS connections to your server,
  // download options for vulnerable browsers,
  // and a host of other vulnerabilities.
  app.use(
    isDev
    ? helmet(helmetConfig)
    : helmet()
  );

  // enable CORS.
  //
  // To enable Cross-origin resource sharing (CORS)
  // which is a mechanism that allows restricted resources
  // from being accessed from external domains.
  app.use(cors());

  // enable compression.
  app.use(compression());

  app.use(cookieParser());

  app.use(expressJson);
  app.use(expressUrlencoded);

  app.use(requestLogger);

  app.use(cleanRequest);
  app.use(wwwRedirect);
  app.use(removeHeaders);
  app.use(delayResponse);
}

module.exports = injectMiddleWares;
