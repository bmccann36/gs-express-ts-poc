const router = require('express').Router();

module.exports = function getApiRouterPath(dbConnection) {
  router.get('/', async (req, res, next) => {
    console.log('\n you hit the get route');

    // const data = await dbConnection.execute('SELECT * FROM tutorials_tbl');
    // console.log(data[0]);
    res.json({
      success: 'get call succeed!',
      // data: data[0],
      url: req.url
    });
  });
  return router;
};


