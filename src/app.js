//3rd party dependencies
var express = require('express');
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware');
const getRoutes = require('./routes');


function createApp(dbConnection) {
  console.log('creating app');
  // declare a new express app
  const app = express();
  app.use(awsServerlessExpressMiddleware.eventContext());
  // Enable CORS for all methods
  app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', '*');
    next();
  });
  // register the path '/api' with router
  app.use('/api', getRoutes(dbConnection));

  // start listening (and create a 'server' object representing our server)
  app.listen(3000, function () {
    console.log('App started');
  });
  return app;
}

module.exports = createApp;
