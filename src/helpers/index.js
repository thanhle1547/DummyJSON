const { requestWhitelist } = require('../constants');
const { isNumber, dataInMemory } = require('../utils/util');
const APIError = require('../utils/error');
const getApp = require('../controllers/firebase_app');

const helpers = {};

helpers.verifyAdmim = id => {
  if (id === undefined) {
    throw new APIError('App name required', 401);
  }

  const app = getApp(id);

  if (app === undefined) {
    throw new APIError('Missing Firebase Credentials', 401);
  }

  return app;
}

// verify if we have user id and it's valid
helpers.verifyUserHandler = id => {
  const userId = (id || '').toString();

  if (!userId) {
    throw new APIError(`User id is required`, 400);
  }

  if (!isNumber(userId)) {
    throw new APIError(`Invalid user id '${userId}'`, 400);
  }

  // see if we can find the user
  const user = dataInMemory.users.find(u => u.id.toString() === userId);
  if (!user) {
    throw new APIError(`User with id '${userId}' not found`, 404);
  }

  return user;
};

// verify if we have post id and it's valid
helpers.verifyPostHandler = id => {
  const postId = (id || '').toString();

  if (!postId) {
    throw new APIError(`Post id is required`, 400);
  }

  if (!isNumber(postId)) {
    throw new APIError(`Invalid post id '${postId}'`, 400);
  }

  // see if we can find the post
  const post = dataInMemory.posts.find(u => u.id.toString() === postId);
  if (!post) {
    throw new APIError(`Post with id '${post}' not found`, 404);
  }

  return post;
};

module.exports = helpers;
