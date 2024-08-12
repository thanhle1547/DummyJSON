const admin = require('firebase-admin');
const { firebaseConfigFiles } = require('../constants');

const apps = {};

/**
 * @param {String} name 
 * @returns {admin.app.App|undefined}
 */
function getApp(name) {
    if (apps[name] === undefined) {
        const credentials = getAppOption(name);

        if (credentials === undefined) return undefined;

        try {
            apps[name] = admin.initializeApp(
                {
                    credential: admin.credential.cert(credentials),
                },
                name,
            );
        } catch (error) {
            console.error(error);
        }
    }

    return apps[name];
}

function getAppOption(cui) {
    const credentialsPath = firebaseConfigFiles[cui];

    if (credentialsPath === undefined) return undefined;

    return require(credentialsPath);
}

module.exports = getApp;
