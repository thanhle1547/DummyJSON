const router = require('express').Router();
const {
  getAllProducts,
  getProductById,
  searchProducts,
  getProductCategoryList,
  getProductCategories,
  getProductsByCategoryName,
} = require('../controllers/product');

// get all products
router.get('/', (req, res) => {
  res.send(getAllProducts({ ...req._options }));
});

// search product
router.get('/search', (req, res) => {
  res.send(searchProducts({ ...req._options }));
});

// get product category list
router.get('/category-list', (req, res) => {
  res.send(getProductCategoryList());
});

// get product categories
router.get('/categories', (req, res) => {
  res.send(getProductCategories());
});

// get product by id
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const { select } = req._options;

  res.send(getProductById({ id, select }));
});

// get products by categoryName
router.get('/category/:categoryName', (req, res) => {
  const { categoryName } = req.params;

  res.send(getProductsByCategoryName({ categoryName, ...req._options }));
});

module.exports = router;
