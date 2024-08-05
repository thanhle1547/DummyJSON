const APIError = require('../utils/error');
const {
  dataInMemory: frozenData,
  getMultiObjectSubset,
  getObjectSubset,
  limitArray,
  sortArray,
} = require('../utils/util');

const controller = {};

// get all products
controller.getAllProducts = ({ limit, skip, select, sortBy, order }) => {
  let products = [...frozenData.products];
  const total = products.length;

  products = sortArray(products, sortBy, order);

  if (skip > 0) {
    products = products.slice(skip);
  }

  products = limitArray(products, limit);

  if (select) {
    products = getMultiObjectSubset(products, select);
  }

  const result = { products, total, skip, limit: products.length };

  return result;
};

// search products
controller.searchProducts = _options => {
  const { limit, skip, select, q: searchQuery, sortBy, order } = _options;

  let products = frozenData.products.filter(p => {
    return (
      p.title.toLowerCase().includes(searchQuery) ||
      p.description.toLowerCase().includes(searchQuery)
    );
  });
  const total = products.length;

  products = sortArray(products, sortBy, order);

  if (skip > 0) {
    products = products.slice(skip);
  }

  products = limitArray(products, limit);

  if (select) {
    products = getMultiObjectSubset(products, select);
  }

  const result = { products, total, skip, limit: products.length };

  return result;
};

// get product category list
controller.getProductCategoryList = () => {
  return frozenData.categoryList;
};

// get product categories
controller.getProductCategories = () => {
  return frozenData.categories;
};

// get product by id
controller.getProductById = ({ id, select }) => {
  const productFrozen = frozenData.products.find(p => p.id.toString() === id);

  if (!productFrozen) {
    throw new APIError(`Product with id '${id}' not found`, 404);
  }

  let { ...product } = productFrozen;

  if (select) {
    product = getObjectSubset(product, select);
  }

  return product;
};

// get products by categoryName
controller.getProductsByCategoryName = ({ categoryName = '', ..._options }) => {
  const { limit, skip, select, sortBy, order } = _options;

  let products = frozenData.products.filter(
    p => p.category.toLowerCase() === categoryName.toLowerCase(),
  );
  const total = products.length;

  products = sortArray(products, sortBy, order);

  if (skip > 0) {
    products = products.slice(skip);
  }

  products = limitArray(products, limit);

  if (select) {
    products = getMultiObjectSubset(products, select);
  }

  const result = { products, total, skip, limit: products.length };

  return result;
};

module.exports = controller;
