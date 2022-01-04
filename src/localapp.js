const createApp = require('./app');


// const initDbConnection = require('./util/dbConnect');

// new up what needs to be newed up
let connection;


(async _ => {
  // connection = await initDbConnection(envService);
  createApp(connection);
})();
