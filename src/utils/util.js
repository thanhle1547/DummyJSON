const fs = require('node:fs/promises');
const path = require('node:path');
const { v4 } = require('uuid');
const { REQUIRED_ENV_VARIABLES, OPTIONAL_ENV_VARIABLES, httpCodes } = require('../constants');
const { logWarn } = require('../helpers/logger');

const utils = {};

const data = {
  products: [],
  carts: [],
  users: [],
  quotes: [],
  todos: [],
  posts: [],
  comments: [],
  httpCodes: {
    codes: Object.keys(httpCodes),
    messages: httpCodes,
  },
};

utils.dataInMemory = data;

utils.isDev = process.env.NODE_ENV === 'development';

utils.loadDataInMemory = async () => {
  const baseDir = './database';

  const productsDir = path.join(baseDir, 'products');
  const apparelProductsDir = path.join(productsDir, 'apparel');

  const productsPath = path.join(productsDir, 'products.json');
  const apparelProductsPath = path.join(apparelProductsDir, 'apparel.json');

  const cartsPath = path.join(baseDir, 'carts.json');
  const usersPath = path.join(baseDir, 'users.json');
  const quotesPath = path.join(baseDir, 'quotes.json');
  const todosPath = path.join(baseDir, 'todos.json');
  const postsPath = path.join(baseDir, 'posts.json');
  const commentsPath = path.join(baseDir, 'comments.json');
  const recipesPath = path.join(baseDir, 'recipes.json');

  const paths = [
    fs.readFile(productsPath, 'utf-8'),
    fs.readFile(apparelProductsPath, 'utf-8'),

    fs.readFile(cartsPath, 'utf-8'),
    fs.readFile(usersPath, 'utf-8'),
    fs.readFile(quotesPath, 'utf-8'),
    fs.readFile(todosPath, 'utf-8'),
    fs.readFile(postsPath, 'utf-8'),
    fs.readFile(commentsPath, 'utf-8'),
    fs.readFile(recipesPath, 'utf-8'),
  ];

  const [
    productsStr,
    apparelProductsStr,
    cartsStr,
    usersStr,
    quotesStr,
    todosStr,
    postsStr,
    commentsStr,
    recipesStr,
  ] = await Promise.all(paths);

  const productsArr = JSON.parse(productsStr);
  const apparelProductsArr = JSON.parse(apparelProductsStr);
  const categoryList = [
    ...new Set([
        ...new Set(productsArr.map(p => p.category)),
        ...new Set(apparelProductsArr.map(p => p.category)),
    ]),
  ];
  const categories = utils.getSluggedData(categoryList, 'products', 'category');
  const cartsArr = JSON.parse(cartsStr);
  const usersArr = JSON.parse(usersStr);
  const quotesArr = JSON.parse(quotesStr);
  const recipesArr = JSON.parse(recipesStr);
  const todosArr = JSON.parse(todosStr);
  const postsArr = JSON.parse(postsStr);
  const tagList = [...new Set(postsArr.flatMap(p => p.tags))];
  const tags = utils.getSluggedData(tagList, 'posts', 'tag');
  const commentsArr = JSON.parse(commentsStr);

  data.products = [
    ...productsArr,
    ...apparelProductsArr,
  ];
  data.categoryList = categoryList;
  data.categories = categories;
  data.carts = cartsArr;
  data.users = usersArr;
  data.quotes = quotesArr;
  data.recipes = recipesArr;
  data.todos = todosArr;
  data.posts = postsArr;
  data.tagList = tagList;
  data.tags = tags;
  data.comments = commentsArr;

  utils.deepFreeze(data);
};

utils.getObjectSubset = function (obj, keys) {
  return Object.assign({}, ...keys.map(key => ({ [key]: obj[key] })));
};

utils.getMultiObjectSubset = function (arr, keys) {
  return arr.map(p => utils.getObjectSubset(p, keys));
};

utils.isNumber = num => !Number.isNaN(Number(num));

utils.validateEnvVar = () => {
  const requiredUnsetEnv = REQUIRED_ENV_VARIABLES.filter(env => !(typeof process.env[env] !== 'undefined'));

  if (requiredUnsetEnv.length) {
    throw new Error(`Required ENV variables are not set: [${requiredUnsetEnv.join(', ')}]`);
  }

  const optionalUnsetEnv = OPTIONAL_ENV_VARIABLES.filter(env => !(typeof process.env[env] !== 'undefined'));

  if (optionalUnsetEnv.length) {
    logWarn(`Optional ENV variables are not set: [${optionalUnsetEnv.join(', ')}]`);
  }
};

const emailRegex = RegExp(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,})$/);
utils.validateEmail = email => {
  return emailRegex.test(String(email).toLowerCase());
};

utils.trueTypeOf = obj => {
  return Object.prototype.toString
    .call(obj)
    .slice(8, -1)
    .toLowerCase();
};

utils.isEmpty = value => {
  const type = utils.trueTypeOf(value);

  if (value === null || value === undefined) return true;
  if (type === 'string' && value.trim() === '') return true;
  if (type === 'array' && value.length === 0) return true;
  if (type === 'object' && Object.keys(value).length === 0) return true;

  return false;
};

utils.deepFreeze = function(obj) {
  Object.freeze(obj);

  if (obj === undefined) {
    return obj;
  }

  Object.getOwnPropertyNames(obj).forEach(prop => {
    if (
      obj[prop] !== null &&
      (typeof obj[prop] === 'object' || typeof obj[prop] === 'function') &&
      !Object.isFrozen(obj[prop])
    ) {
      utils.deepFreeze(obj[prop]);
    }
  });

  return obj;
};

utils.deepCopy = obj => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const copy = Array.isArray(obj) ? [] : {};
  Object.keys(obj).forEach(key => {
    copy[key] = utils.deepCopy(obj[key]);
  });
  return copy;
};

utils.getNestedValue = (obj, keys) => {
  if (!keys) {
    return null;
  }

  return keys.split('.').reduce((o, k) => (o || {})[k], obj);
};

// Group objects by property
utils.groupBy = (arr, keys) => {
  return arr.reduce((groups, item) => {
    const compositeKey = keys.map(key => item[key]).join('-');
    const group = (groups[compositeKey] || []);
    group.push(item);
    groups[compositeKey] = group;
    return groups;
  }, {});
}

utils.limitArray = (arr, limit) => {
  return limit === 0 || limit > arr.length ? arr : arr.slice(0, limit);
};

utils.filterArray = (arr, filterBy) => {
  if (filterBy.length == 0) return arr;

  const arrCopy = utils.deepCopy(arr);

  const filteredArray = arrCopy.filter((item) => {
    for (const option of filterBy) {
      const value = item[option.property]

      if (option.condition == 'range') {
        const range = option.value;
        const from = range.from;
        const to = range.to;

        if (from !== undefined && to !== undefined) {
          return value >= from && value <= to;
        } else if (from !== undefined) {
          return value >= from;
        } else if (to !== undefined) {
          return value <= to;
        } else {
          return true;
        }
      }
    }
    return true;
  });

  return filteredArray;
}

utils.sortArray = (arr, sortBy, order) => {
  const arrCopy = utils.deepCopy(arr);

  const sortedArray = arrCopy.sort((a, b) => {
    if (a[sortBy] === b[sortBy]) return 0;
    if (order === 'asc') {
      return a[sortBy] > b[sortBy] ? 1 : -1;
    }
    return a[sortBy] < b[sortBy] ? 1 : -1;
  });

  return sortedArray;
};

utils.capitalize = str => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

utils.isValidNumberInRange = (num, start, end) => {
  const parsedNum = Number(num);
  return !Number.isNaN(parsedNum) && parsedNum >= start && parsedNum <= end;
};

utils.roundAt2DecimalPlaces = (num) => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

utils.getRandomFromArray = array => {
  return array[Math.floor(Math.random() * array.length)];
};

utils.getSluggedData = (arr, resource, type) => {
  return arr.map(item => ({
    slug: item,
    name: utils.capitalizeWords(item),
    url: `https://dummyjson.com/${resource}/${type}/${item}`,
  }));
};

utils.capitalizeWords = str => {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

utils.findUserWithUsername = (username) => {
  const effectiveUsername = username.toLowerCase();
  const user = utils.dataInMemory.users.find(u => {
    return u.username.toLowerCase() === effectiveUsername;
  });

  return user;
};

utils.findUserWithEmail = (email) => {
  const effectiveEmail = email.toLowerCase();
  const user = utils.dataInMemory.users.find(u => {
    return u.email.toLowerCase() === effectiveEmail;
  });

  return user;
};

utils.findUserWithUsernameAndId = ({ username, id }) => {
  const effectiveUsername = username.toLowerCase();
  const effectiveId = id.toString();
  const user = utils.dataInMemory.users.find(u => {
    const validUsername = u.username.toLowerCase() === effectiveUsername;
    const validId = u.id.toString() === effectiveId;

    return validUsername && validId;
  });

  return user;
};

utils.getUserPayload = user => ({
  id: user.id,
  username: user.username,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  gender: user.gender,
  image: user.image,
});

utils.generateRandomId = () => {
  const uuid = v4();
  const parts = uuid.split('-');
  return `${parts[0].slice(0, 4)}-${parts[1]}-${parts[2].slice(0, 4)}-${parts[3]}`;
};

utils.timeDifference = (startDateMS, endDateMS) => {
  const difference = endDateMS - startDateMS;
  const minutes = Math.floor(difference / 1000 / 60);
  const hours = Math.floor(difference / 1000 / 60 / 60);
  const days = Math.floor(difference / 1000 / 60 / 60 / 24);
  const remainingHours = hours % 24;
  const remainingMinutes = minutes % 60;

  let result = '';
  if (days > 0) result += `${days} days, `;
  if (remainingHours > 0) result += `${remainingHours} hours, `;
  if (remainingMinutes >= 0) result += `${remainingMinutes} minutes`;

  return result;
};

module.exports = utils;
