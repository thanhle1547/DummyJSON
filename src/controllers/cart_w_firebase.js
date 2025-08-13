const APIError = require('../utils/error');
const { getCartCollectionRef } = require("../utils/firebase");
const {
  verifyAccessToken,
  isAccessTokenEmpty,
} = require('../utils/jwt');
const {
  dataInMemory: frozenData,
  groupBy,
  roundAt2DecimalPlaces,
} = require('../utils/util');

const controller = {};

controller.getCartItems = async data => {
  const { token } = data;

  if (!token) throw new APIError('Authentication Problem', 403);

  if (isAccessTokenEmpty(token)) {
    throw new APIError(`Invalid token`, 400);
  }

  const decoded = await verifyAccessToken(token);

  const userId = decoded.id;

  if (!userId) {
    throw new APIError(`Invalid credentials`, 400);
  }

  const cartCollectionRef = getCartCollectionRef(data);
  const userCartRef = cartCollectionRef.doc(userId);
  const userCartSnapshot = await userCartRef.get();

  if (!userCartSnapshot.exists) {
    // prepare cart
    const cart = {
      products: [],
      total: 0,
      discountedTotal: 0,
      delivery: {
        charge: 0,
      },
      totalQuantity: 0,
      selectedCount: 0,
    };

    return cart;
  }

  const userCart = userCartSnapshot.data();

  const cartItems = userCart.items || [];

  if (cartItems.length == 0) {
    // prepare cart
    const cart = {
      products: [],
      total: 0,
      discountedTotal: 0,
      delivery: {
        charge: 0,
      },
      totalQuantity: 0,
      selectedCount: 0,
    };

    return cart;
  }

  const productIds = new Set();

  for (const item of cartItems) {
    const productId = item.id;

    productIds.add(productId);
  }

  // get all possible products by ids
  const productsByIds = new Map();
  for (const product of frozenData.products) {
    if (productIds.has(product.id)) {
      productsByIds.set(product.id, product);
    }
  }

  // set variables to count the totals of cart by products
  let total = 0;
  let discountedTotal = 0;
  let totalQuantity = 0;

  // get products in the relevant schema
  const someProducts = [];
  for (const item of cartItems) {
    const id = item.id;
    const product = productsByIds.get(id);

    if (product == undefined) continue;

    const itemQuantity = item.quantity || 0;
    const itemVariantId = item.variantId;

    let itemStock;
    // total price (price * quantity)
    let priceWithQty;
    // apply discount on the product if applicable
    let discountedPrice;
    if (itemVariantId) {
      const productVariant = product.variants.find(
        p => p.id === itemVariantId,
      );

      itemStock = productVariant.stock;
      priceWithQty = productVariant.price * itemQuantity;
      discountedPrice = roundAt2DecimalPlaces(
        priceWithQty * ((100 - productVariant.discountPercentage) / 100),
      );
    } else {
      itemStock = product.stock;
      priceWithQty = product.price * itemQuantity;
      discountedPrice = roundAt2DecimalPlaces(
        priceWithQty * ((100 - product.discountPercentage) / 100),
      );
    }

    // update cart variables
    total += priceWithQty;
    discountedTotal += discountedPrice;
    totalQuantity += itemQuantity;

    // set product with correct schema
    someProducts.push({
      id: product.id,
      variantId: itemVariantId,
      title: product.title,
      price: product.price,
      stock: itemStock,
      quantity: itemQuantity,
      total: priceWithQty,
      discountPercentage: product.discountPercentage,
      discountedPrice,
      thumbnail: product.thumbnail,
    });
  }

  total = roundAt2DecimalPlaces(total);
  discountedTotal = roundAt2DecimalPlaces(discountedTotal);

  // prepare cart
  const cart = {
    products: someProducts,
    total,
    discountedTotal,
    delivery: {
      charge: 0,
    },
    totalQuantity,
    selectedCount: 0,
  };

  return cart;
};

function mergeCartItems(cartItems) {
  const groupedCartItems = groupBy(cartItems, ['id', 'variantId']);

  const groupedValues = Object.values(groupedCartItems);

  if (groupedValues.every(v => v.length == 1)) {
    return cartItems;
  }

  return groupedValues.reduce(
    (accumulator, currentArray) => {
      // merge multiple cart items with sum of quantity
      const mergeItem = currentArray.reduce(
        (accumulator, currentItem) => {
          for (let [key, value] of Object.entries(currentItem)) {
            if (accumulator[key] && key == 'quantity') {
              accumulator[key] += value;
            } else {
              accumulator[key] = value;
            }
          }

          return accumulator;
        },
        {}
      );

      accumulator.push(mergeItem);

      return accumulator;
    },
    []
  );
}

controller.addItemToCart = async data => {
  const { token, productId, productVariantId, quantity } = data;

  if (!token) throw new APIError('Authentication Problem', 403);

  if (isAccessTokenEmpty(token)) {
    throw new APIError(`Invalid token`, 400);
  }

  const decoded = await verifyAccessToken(token);

  const userId = decoded.id;

  if (!userId) {
    throw new APIError(`Invalid credentials`, 400);
  }

  if (!productId || !quantity) {
    throw new APIError(`productId and quantity are required`, 400);
  }

  if (!Number.isInteger(quantity)) {
    throw new APIError(`quantity must be an integer`, 400);
  }

  if (quantity < 1) {
    throw new APIError(`quantity must be a positive number`, 400);
  }

  const cartCollectionRef = getCartCollectionRef(data);
  const userCartRef = cartCollectionRef.doc(userId);
  const userCartSnapshot = await userCartRef.get();
  let userCart;

  if (userCartSnapshot.exists) {
    userCart = userCartSnapshot.data();
  } else {
    userCart = {
      items: [],
    };
  }

  const productIds = new Set([productId]);
  
  let cartItems = userCart.items || [];
  for (const item of cartItems) {
    const productId = item.id;

    productIds.add(productId);
  }

  // get all possible products by ids
  const productsByIds = new Map();
  let foundProductWithProvideId = false;
  let foundProductWithProvideVariantId = productVariantId == undefined;
  if (cartItems.length == 0) {
    const product = frozenData.products.find(p => {
      return p.id === productId;
    });

    foundProductWithProvideId = product != undefined;

    if (productVariantId) {
      const variants = product.variants;

      if (variants && Array.isArray(variants)) {
        foundProductWithProvideVariantId = variants.some(v => v.id === productVariantId);
      }
    }

    productsByIds.set(productId, product);
  } else {
    for (const product of frozenData.products) {
      if (product.id === productId) {
        foundProductWithProvideId = true;

        if (!productVariantId) {
          productsByIds.set(product.id, product);
        } else {
          const variants = product.variants;

          if (variants && Array.isArray(variants)) {
            foundProductWithProvideVariantId = variants.some(v => v.id === productVariantId);

            if (foundProductWithProvideVariantId) {
              productsByIds.set(product.id, product);
            }
          }
        }

        continue;
      }

      if (productIds.has(product.id)) {
        productsByIds.set(product.id, product);
      }
    }
  }

  if (!foundProductWithProvideId) {
    throw new APIError(`Product with id '${productId}' not found`, 404);
  }

  if (!foundProductWithProvideVariantId) {
    throw new APIError(`Product with id '${productId}' and variant id ${productVariantId} not found`, 404);
  }

  // add item to the cart
  cartItems.push({
    id: productId,
    variantId: productVariantId || null, // Assign null if p.variantId is undefined
    quantity: quantity,
  });

  // merge duplicate cart items in to one
  cartItems = mergeCartItems(cartItems);

  // set variables to count the totals of cart by products
  let total = 0;
  let discountedTotal = 0;
  let totalQuantity = 0;

  // get products in the relevant schema
  const someProducts = [];
  for (const item of cartItems) {
    const id = item.id;
    const product = productsByIds.get(id);

    if (product == undefined) continue;

    const itemQuantity = item.quantity || 0;
    const itemVariantId = item.variantId;

    let itemStock;
    // total price (price * quantity)
    let priceWithQty;
    // apply discount on the product if applicable
    let discountedPrice;
    if (itemVariantId) {
      const productVariant = product.variants.find(
        p => p.id === itemVariantId,
      );

      itemStock = productVariant.stock;
      priceWithQty = productVariant.price * itemQuantity;
      discountedPrice = roundAt2DecimalPlaces(
        priceWithQty * ((100 - productVariant.discountPercentage) / 100),
      );
    } else {
      itemStock = product.stock;
      priceWithQty = product.price * itemQuantity;
      discountedPrice = roundAt2DecimalPlaces(
        priceWithQty * ((100 - product.discountPercentage) / 100),
      );
    }

    // update cart variables
    total += priceWithQty;
    discountedTotal += discountedPrice;
    totalQuantity += itemQuantity;

    // set product with correct schema
    someProducts.push({
      id: product.id,
      variantId: itemVariantId,
      title: product.title,
      price: product.price,
      stock: itemStock,
      quantity: itemQuantity,
      total: priceWithQty,
      discountPercentage: product.discountPercentage,
      discountedPrice,
      thumbnail: product.thumbnail,
    });
  }

  total = roundAt2DecimalPlaces(total);
  discountedTotal = roundAt2DecimalPlaces(discountedTotal);

  // prepare cart
  const cart = {
    products: someProducts,
    total,
    discountedTotal,
    delivery: {
      charge: 0,
    },
    totalQuantity,
    selectedCount: 0,
  };

  await userCartRef.set({
    items: someProducts.map(p => {
      return {
        id: p.id,
        variantId: p.variantId || null, // Assign null if p.variantId is undefined
        quantity: p.quantity,
      };
    }),
  });

  return cart;
};

controller.updateCartItem = async data => {
  const { token, productId, productVariantId, quantity } = data;

  if (!token) throw new APIError('Authentication Problem', 403);

  if (isAccessTokenEmpty(token)) {
    throw new APIError(`Invalid token`, 400);
  }

  const decoded = await verifyAccessToken(token);

  const userId = decoded.id;

  if (!userId) {
    throw new APIError(`Invalid credentials`, 400);
  }

  if (!productId || !quantity) {
    throw new APIError(`productId and quantity are required`, 400);
  }

  if (!Number.isInteger(quantity)) {
    throw new APIError(`quantity must be an integer`, 400);
  }

  if (quantity < 1) {
    throw new APIError(`quantity must be a positive number`, 400);
  }

  const cartCollectionRef = getCartCollectionRef(data);
  const userCartRef = cartCollectionRef.doc(userId);
  const userCartSnapshot = await userCartRef.get();

  if (!userCartSnapshot.exists) {
    throw new APIError(`cart is empty`, 400);
  }

  let userCart = userCartSnapshot.data();

  let cartItems = userCart.items || [];
  if (cartItems.length == 0) {
    throw new APIError(`cart is empty`, 400);
  }

  const productIds = new Set([]);
  for (const item of cartItems) {
    const productId = item.id;

    productIds.add(productId);
  }

  if (!productIds.has(productId)) {
    throw new APIError(`Product with id '${productId}' not in the cart`, 404);
  }

  let requestCartItem = cartItems.find(item => item.id == productId && item.variantId == productVariantId);

  if (requestCartItem == undefined) {
    throw new APIError(`Product with id '${productId}' and variant id ${productVariantId} not in the cart`, 404);
  }

  // get all possible products by ids
  const productsByIds = new Map();
  let foundProductWithProvideId = false;
  let foundProductWithProvideVariantId = productVariantId == undefined;

  for (const product of frozenData.products) {
    if (product.id === productId) {
      foundProductWithProvideId = true;

      if (!productVariantId) {
        productsByIds.set(product.id, product);
      } else {
        const variants = product.variants;

        if (variants && Array.isArray(variants)) {
          foundProductWithProvideVariantId = variants.some(v => v.id === productVariantId);

          if (foundProductWithProvideVariantId) {
            productsByIds.set(product.id, product);
          }
        }
      }

      continue;
    }

    if (productIds.has(product.id)) {
      productsByIds.set(product.id, product);
    }
  }

  if (!foundProductWithProvideId) {
    throw new APIError(`Product with id '${productId}' not found`, 404);
  }

  if (!foundProductWithProvideVariantId) {
    throw new APIError(`Product with id '${productId}' and variant id ${productVariantId} not found`, 404);
  }

  // merge duplicate cart items in to one
  cartItems = mergeCartItems(cartItems);

  // find the product update request after the merged
  requestCartItem = cartItems.find(item => item.id == productId && item.variantId == productVariantId);
  // update the quantity of the request product
  requestCartItem.quantity = quantity;

  // set variables to count the totals of cart by products
  let total = 0;
  let discountedTotal = 0;
  let totalQuantity = 0;

  // get products in the relevant schema
  const someProducts = [];
  for (const item of cartItems) {
    const id = item.id;
    const product = productsByIds.get(id);

    if (product == undefined) continue;

    const itemQuantity = item.quantity || 0;
    const itemVariantId = item.variantId;

    let itemStock;
    // total price (price * quantity)
    let priceWithQty;
    // apply discount on the product if applicable
    let discountedPrice;
    if (itemVariantId) {
      const productVariant = product.variants.find(
        p => p.id === itemVariantId,
      );

      itemStock = productVariant.stock;
      priceWithQty = productVariant.price * itemQuantity;
      discountedPrice = roundAt2DecimalPlaces(
        priceWithQty * ((100 - productVariant.discountPercentage) / 100),
      );
    } else {
      itemStock = product.stock;
      priceWithQty = product.price * itemQuantity;
      discountedPrice = roundAt2DecimalPlaces(
        priceWithQty * ((100 - product.discountPercentage) / 100),
      );
    }

    // update cart variables
    total += priceWithQty;
    discountedTotal += discountedPrice;
    totalQuantity += itemQuantity;

    // set product with correct schema
    someProducts.push({
      id: product.id,
      variantId: itemVariantId,
      title: product.title,
      price: product.price,
      stock: itemStock,
      quantity: itemQuantity,
      total: priceWithQty,
      discountPercentage: product.discountPercentage,
      discountedPrice,
      thumbnail: product.thumbnail,
    });
  }

  total = roundAt2DecimalPlaces(total);
  discountedTotal = roundAt2DecimalPlaces(discountedTotal);

  // prepare cart
  const cart = {
    products: someProducts,
    total,
    discountedTotal,
    delivery: {
      charge: 0,
    },
    totalQuantity,
    selectedCount: 0,
  };

  await userCartRef.set({
    items: someProducts.map(p => {
      return {
        id: p.id,
        variantId: p.variantId || null, // Assign null if p.variantId is undefined
        quantity: p.quantity,
      };
    }),
  });

  return cart;
};

controller.removeCartItem = async data => {
  const { token, productId, productVariantId } = data;

  if (!token) throw new APIError('Authentication Problem', 403);

  if (isAccessTokenEmpty(token)) {
    throw new APIError(`Invalid token`, 400);
  }

  const decoded = await verifyAccessToken(token);

  const userId = decoded.id;

  if (!userId) {
    throw new APIError(`Invalid credentials`, 400);
  }

  if (!productId) {
    throw new APIError(`productId and quantity are required`, 400);
  }

  const cartCollectionRef = getCartCollectionRef(data);
  const userCartRef = cartCollectionRef.doc(userId);
  const userCartSnapshot = await userCartRef.get();

  if (!userCartSnapshot.exists) {
    throw new APIError(`cart is empty`, 400);
  }

  let userCart = userCartSnapshot.data();

  let cartItems = userCart.items || [];
  if (cartItems.length == 0) {
    throw new APIError(`cart is empty`, 400);
  }

  const productIds = new Set([]);
  for (const item of cartItems) {
    const productId = item.id;

    productIds.add(productId);
  }

  if (!productIds.has(productId)) {
    throw new APIError(`Product with id '${productId}' not in the cart`, 404);
  }

  const requestCartItem = cartItems.find(item => item.id == productId && item.variantId == productVariantId);

  if (requestCartItem == undefined) {
    throw new APIError(`Product with id '${productId}' and variant id ${productVariantId} not in the cart`, 404);
  }

  // get all possible products by ids
  const productsByIds = new Map();
  let foundProductWithProvideId = false;
  let foundProductWithProvideVariantId = productVariantId == undefined;

  for (const product of frozenData.products) {
    if (product.id === productId) {
      foundProductWithProvideId = true;

      if (!productVariantId) {
        productsByIds.set(product.id, product);
      } else {
        const variants = product.variants;

        if (variants && Array.isArray(variants)) {
          foundProductWithProvideVariantId = variants.some(v => v.id === productVariantId);

          if (foundProductWithProvideVariantId) {
            productsByIds.set(product.id, product);
          }
        }
      }

      continue;
    }

    if (productIds.has(product.id)) {
      productsByIds.set(product.id, product);
    }
  }

  if (!foundProductWithProvideId) {
    throw new APIError(`Product with id '${productId}' not found`, 404);
  }

  if (!foundProductWithProvideVariantId) {
    throw new APIError(`Product with id '${productId}' and variant id ${productVariantId} not found`, 404);
  }

  // merge duplicate cart items in to one
  cartItems = mergeCartItems(cartItems);

  // find the product update request after the merged
  const requestCartItemIndex = cartItems.findIndex(item => item.id == productId && item.variantId == productVariantId);

  if (requestCartItemIndex === -1) {
    throw new APIError(`Product with id '${productId}' and variant id ${productVariantId} not in the cart`, 404);
  }

  // remove request product
  cartItems.splice(requestCartItemIndex, 1);

  // set variables to count the totals of cart by products
  let total = 0;
  let discountedTotal = 0;
  let totalQuantity = 0;

  // get products in the relevant schema
  const someProducts = [];
  for (const item of cartItems) {
    const id = item.id;
    const product = productsByIds.get(id);

    if (product == undefined) continue;

    const itemQuantity = item.quantity || 0;
    const itemVariantId = item.variantId;

    let itemStock;
    // total price (price * quantity)
    let priceWithQty;
    // apply discount on the product if applicable
    let discountedPrice;
    if (itemVariantId) {
      const productVariant = product.variants.find(
        p => p.id === itemVariantId,
      );

      itemStock = productVariant.stock;
      priceWithQty = productVariant.price * itemQuantity;
      discountedPrice = roundAt2DecimalPlaces(
        priceWithQty * ((100 - productVariant.discountPercentage) / 100),
      );
    } else {
      itemStock = product.stock;
      priceWithQty = product.price * itemQuantity;
      discountedPrice = roundAt2DecimalPlaces(
        priceWithQty * ((100 - product.discountPercentage) / 100),
      );
    }

    // update cart variables
    total += priceWithQty;
    discountedTotal += discountedPrice;
    totalQuantity += itemQuantity;

    // set product with correct schema
    someProducts.push({
      id: product.id,
      variantId: itemVariantId,
      title: product.title,
      price: product.price,
      stock: itemStock,
      quantity: itemQuantity,
      total: priceWithQty,
      discountPercentage: product.discountPercentage,
      discountedPrice,
      thumbnail: product.thumbnail,
    });
  }

  total = roundAt2DecimalPlaces(total);
  discountedTotal = roundAt2DecimalPlaces(discountedTotal);

  // prepare cart
  const cart = {
    products: someProducts,
    total,
    discountedTotal,
    delivery: {
      charge: 0,
    },
    totalQuantity,
    selectedCount: 0,
  };

  await userCartRef.set({
    items: someProducts.map(p => {
      return {
        id: p.id,
        variantId: p.variantId || null, // Assign null if p.variantId is undefined
        quantity: p.quantity,
      };
    }),
  });

  return cart;
};

module.exports = controller;
