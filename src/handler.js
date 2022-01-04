const awsServerlessExpress = require('aws-serverless-express');
const createApp = require('./app');


// new up what needs to be newed up
let server;
let connection;
let app;


exports.main = async (event, context) => {
  // envService = await envService.init();
  // connection = await getNewOrCachedConn(envService);
  if (app == undefined) {
    app = createApp(connection);
  }
  if (server == undefined) {
    server = awsServerlessExpress.createServer(app);
  }
  return awsServerlessExpress.proxy(server, event, context, 'PROMISE').promise;
};
