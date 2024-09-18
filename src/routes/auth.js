const router = require('express').Router();
const {
  loginByUsernamePassword,
  loginSocial,
  getNewRefreshToken,
  getNewRefreshTokenForFirebaseUser,
  getUserInfo,
  getUserInfoOnFirebase,
  register,
  isUsernameExisted,
  isEmailExisted,
  loginByUsernamePasswordOnFirebase,
  forgotPassword,
  resetPassword,
  changePassword,
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

router.post('/login-on-firebase/:id', async (req, res, next) => {
  const { id } = req.params;

  try {
    const payload = await loginByUsernamePasswordOnFirebase({ appName: id, ...req.body });

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

router.post('/register/:id', async (req, res, next) => {
  const { id } = req.params;

  try {
    const payload = await register({ appName: id, ...req.body });

    res.send(payload);
  } catch (error) {
    next(error);
  }
});

router.post('/check-username-exist/:id', async (req, res, next) => {
  const { id } = req.params;

  try {
    const result = await isUsernameExisted({ appName: id, ...req.body });

    res.status(200).send({
      status: 'ok',
      result: result,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/check-email-exist/:id', async (req, res, next) => {
  const { id } = req.params;

  try {
    const result = await isEmailExisted({ appName: id, ...req.body });

    res.status(200).send({
      status: 'ok',
      result: result,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/verify-otp/:id', async (req, res, next) => {
  const { id } = req.params;

  try {
    const payload = await verifyOtp({ appName: id, ...req.body });

    res.send(payload);
  } catch (error) {
    next(error);
  }
});

router.post('/forgot-password/:id', async (req, res, next) => {
  const { id } = req.params;

  try {
    const payload = await forgotPassword({ appName: id, ...req.body });

    res.send(payload);
  } catch (error) {
    next(error);
  }
});

router.post('/reset-password/:id', async (req, res, next) => {
  const { id } = req.params;

  try {
    const payload = await resetPassword({ appName: id, ...req.body });

    res.send(payload);
  } catch (error) {
    next(error);
  }
});

router.post('/change-password/:id', async (req, res, next) => {
  const { id } = req.params;
  const token = req.header('Authorization');

  try {
    const payload = await changePassword({ appName: id, token, ...req.body });

    res.send(payload);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
