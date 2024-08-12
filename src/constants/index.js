const fs = require('fs');
const httpCodes = require('./httpCodes');
const path = require('path');

const firebaseConfigDir = process.env.FB_CONFIG_DIRS;

const constants = {};

constants.REQUIRED_ENV_VARIABLES = ['JWT_SECRET'];
constants.OPTIONAL_ENV_VARIABLES = [];

constants.requestWhitelist = ['/favicon.ico', '/static', '/public', '/fav.png'];

constants.httpCodes = httpCodes;

constants.thirtyDaysInMints = 30 * 24 * 60;

try {
    constants.firebaseConfigFiles = fs
        .readdirSync(firebaseConfigDir, { withFileTypes: true })
        .filter( item => !item.isDirectory() )
        .map( item => item.name )
        .reduce((a, item) => {
            const parts = item.split('.');
            const base = parts[0];
            const id = parts[1];
            const ext = parts[2];

            if (ext === 'json' && base === 'firebase-credentials') {
                const p = path.join(firebaseConfigDir, item);
                a[id] = p;
            }

            return a;
        }, {});

    constants.firebaseConfigCount = constants.firebaseConfigFiles.length;
} catch (error) {
    constants.firebaseConfigFiles = {};
    constants.firebaseConfigCount = -1;
}

module.exports = constants;
