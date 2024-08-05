const httpCodes = require('./httpCodes');

const constants = {};

constants.REQUIRED_ENV_VARIABLES = ['JWT_SECRET'];
constants.OPTIONAL_ENV_VARIABLES = [];

constants.requestWhitelist = ['/favicon.ico', '/static', '/public', '/fav.png'];

constants.httpCodes = httpCodes;

constants.thirtyDaysInMints = 30 * 24 * 60;

module.exports = constants;
