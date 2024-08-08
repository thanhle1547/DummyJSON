const fs = require('fs');
const httpCodes = require('./httpCodes');

const firebaseConfigDir = '/etc/secrets';

const constants = {};

constants.REQUIRED_ENV_VARIABLES = ['JWT_SECRET'];
constants.OPTIONAL_ENV_VARIABLES = [];

constants.requestWhitelist = ['/favicon.ico', '/static', '/public', '/fav.png'];

constants.httpCodes = httpCodes;

constants.thirtyDaysInMints = 30 * 24 * 60;

try {
    constants.firebaseConfigCount = fs.readdirSync(firebaseConfigDir).length;
} catch (error) {
    constants.firebaseConfigCount = -1;
}

module.exports = constants;
