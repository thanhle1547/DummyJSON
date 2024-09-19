const router = require('express').Router();
const {
  loginByUsernamePassword,
  getNewRefreshToken,
  getUserInfo,
} = require('../controllers/auth');
const { verifyOtp } = require('../controllers/otp');
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

module.exports = router;
