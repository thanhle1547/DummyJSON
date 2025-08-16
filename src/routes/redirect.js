const router = require('express').Router();

router.get('/image', (req, res) => {
  res.status(301).redirect('/docs/image');
});

module.exports = router;
