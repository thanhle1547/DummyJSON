const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const cors = require('cors');

const applyRateLimit = require('../utils/applyRateLimit');
const cleanRequest = require('./cleanRequest');
const delayResponse = require('./delayResponse');
const { isDev } = require('../utils/util');

function injectMiddleWares(app) {
  // enable compression.
  app.use(compression());

  // enable CORS.
  //
  // To enable Cross-origin resource sharing (CORS)
  // which is a mechanism that allows restricted resources
  // from being accessed from external domains.
  app.use(cors());

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
    ? helmet({
        crossOriginEmbedderPolicy: false,
        // crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
      })
    : helmet()
  );

  app.use(express.json({ limit: '300kb' })); // for parsing application/json
  app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

  applyRateLimit(app);

  app.use(cleanRequest);

  app.use(delayResponse);
}

module.exports = injectMiddleWares;
