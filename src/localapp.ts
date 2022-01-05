// const app = require('./app');
import app from './app'

let connection;


(async _ => {
  // connection = await initDbConnection(envService);
  // start listening (and create a 'server' object representing our server)
  app.listen(4000, function () {
    console.log('App started');
  });
})();
