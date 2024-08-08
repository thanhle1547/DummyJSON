const router = require('express').Router();
const { firebaseConfigCount } = require('../constants');

router.all('/', (req, res) => {
  res.status(200).send({ status: 'ok', method: req.method });
});

router.get('/firebase-config-exist', (req, res) => {
  res.status(200).send({
    status: 'ok',
    method: req.method,
    result: firebaseConfigCount > 0,
    meta: {
      total: firebaseConfigCount,
    },
  });
});

module.exports = router;
