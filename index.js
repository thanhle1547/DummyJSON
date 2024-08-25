const express = require('express');
const injectMiddleWares = require('./src/middleware');
const errorMiddleware = require('./src/middleware/error');
const routes = require('./src/routes');
const { validateEnvVar, loadDataInMemory, isDev, redirectFn } = require('./src/utils/util');
const { version } = require('./package.json');

const { PORT = 8888, NODE_ENV } = process.env;

// validate if we have all the env variables setup.
validateEnvVar();

const app = express();

setupApp();

async function setupApp() {
  // load all data in memory
  loadDataInMemory();

  // set up all middleware
  injectMiddleWares(app);

  // set ejs as view engine
  app.set('view engine', 'ejs');

  // serving static files
  app.use('/public', isDev ? express.static('public') : redirectFn);

  // routes
  app.use('/', routes);

  app.get('*', (req, res) => {
    res.status(404).send();
  });

  // use custom middleware for errors
  app.use(errorMiddleware);

  // start listening
  app.listen(PORT, () => {
    console.info(`[Node][${NODE_ENV}] App v${version} running at http://localhost:${PORT}`);
  });
}
