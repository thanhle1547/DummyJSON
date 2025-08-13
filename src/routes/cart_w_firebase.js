const router = require('express').Router();
const {
  getCartItems,
  addItemToCart,
  updateCartItem,
  removeCartItem,
} = require('../controllers/cart_w_firebase');
const APIError = require('../utils/error');

router.post('/firebase/items', async (req, res, next) => {
  next(new APIError('App name required', 401));
});

router.post('/firebase/items/', async (req, res, next) => {
  next(new APIError('App name required', 401));
});

router.post('/firebase/items/:id', async (req, res, next) => {
  const { id } = req.params;
  const token = req.header('Authorization');

  try {
    const payload = await getCartItems({ appName: id, token, ...req.body });

    res.send(payload);
  } catch (error) {
    next(error);
  }
});

router.post('/firebase/add', async (req, res, next) => {
  next(new APIError('App name required', 401));
});

router.post('/firebase/add/', async (req, res, next) => {
  next(new APIError('App name required', 401));
});

router.post('/firebase/add/:id', async (req, res, next) => {
  const { id } = req.params;
  const token = req.header('Authorization');

  try {
    const payload = await addItemToCart({ appName: id, token, ...req.body });

    res.send(payload);
  } catch (error) {
    next(error);
  }
});

router.post('/firebase/update', async (req, res, next) => {
  next(new APIError('App name required', 401));
});

router.post('/firebase/update/', async (req, res, next) => {
  next(new APIError('App name required', 401));
});

router.post('/firebase/update/:id', async (req, res, next) => {
  const { id } = req.params;
  const token = req.header('Authorization');

  try {
    const payload = await updateCartItem({ appName: id, token, ...req.body });

    res.send(payload);
  } catch (error) {
    next(error);
  }
});

router.post('/firebase/remove', async (req, res, next) => {
  next(new APIError('App name required', 401));
});

router.post('/firebase/remove/', async (req, res, next) => {
  next(new APIError('App name required', 401));
});

router.post('/firebase/remove/:id', async (req, res, next) => {
  const { id } = req.params;
  const token = req.header('Authorization');

  try {
    const payload = await removeCartItem({ appName: id, token, ...req.body });

    res.send(payload);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
