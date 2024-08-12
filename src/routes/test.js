const router = require('express').Router();
const { firebaseConfigCount } = require('../constants');
const { getSingleFirebaseUsers } = require('../controllers/auth');
const getApp = require('../controllers/firebase_app');

router.all('/', (req, res) => {
  res.status(200).send({ status: 'ok', method: req.method });
});

router.get('/firebase-config-exist/:id', (req, res) => {
  const { id } = req.params;

  if (id !== undefined) {
    const admin = getApp(id);

    res.status(200).send({
      status: 'ok',
      method: req.method,
      result: admin !== undefined,
    });
    return;
  }

  res.status(200).send({
    status: 'ok',
    method: req.method,
    result: firebaseConfigCount > 0,
    meta: {
      total: firebaseConfigCount,
    },
  });
});


router.get('/get-single-firebase-users/:id', async (req, res, next) => {
  const { id } = req.params;

  try {
    const result = await getSingleFirebaseUsers({ appName: id });

    res.send({
      status: 'ok',
      method: req.method,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
