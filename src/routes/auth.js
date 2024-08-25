const router = require('express').Router();
const { loginByUsernamePassword, loginSocial, getNewRefreshToken } = require('../controllers/auth');
const authUser = require('../middleware/auth');
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
router.get('/me', authUser, (req, res) => {
  res.send(req.user);
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

module.exports = router;
