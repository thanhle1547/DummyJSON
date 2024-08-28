const router = require('express').Router();
const {
  loginByUsernamePassword,
  loginSocial,
  getNewRefreshToken,
  getNewRefreshTokenForFirebaseUser,
  getUserInfo,
  getUserInfoOnFirebase,
} = require('../controllers/auth');
const APIError = require('../utils/error');

// login user
router.post('/login', async (req, res, next) => {
  try {
    const payload = await loginByUsernamePassword(req.body);

    res.send(payload);
  } catch (error) {
    next(error);
  }
});

router.get('/login-social/', async (req, res, next) => {
  next(new APIError('App name required', 401));
});

router.post('/login-social', async (req, res, next) => {
  next(new APIError('App name required', 401));
});

router.post('/login-social/:id', async (req, res, next) => {
  const { id } = req.params;

  try {
    const payload = await loginSocial({ appName: id, ...req.body });

    res.send(payload);
  } catch (error) {
    next(error);
  }
});

// get current authenticated user
router.get('/me', async (req, res, next) => {
  const token = req.header('Authorization');

  try {
    const payload = await getUserInfo({ token });

    res.send(payload);
  } catch (error) {
    next(error);
  }
});

// get current authenticated user
router.get('/me/:id', async (req, res, next) => {
  const { id } = req.params;
  const token = req.header('Authorization');

  try {
    const payload = await getUserInfoOnFirebase({ appName: id, token });

    res.send(payload);
  } catch (error) {
    next(error);
  }
});

// get new refresh token
router.post('/refresh', async (req, res, next) => {
  try {
    const tokens = await getNewRefreshToken(req.body);

    res.send(tokens);
  } catch (error) {
    next(error);
  }
});

router.get('/refresh/', async (req, res, next) => {
  next(new APIError('App name required', 401));
});

// get new refresh token
router.post('/refresh/:id', async (req, res, next) => {
  const { id } = req.params;

  try {
    const tokens = await getNewRefreshTokenForFirebaseUser({ appName: id, ...req.body });

    res.send(tokens);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
