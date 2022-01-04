const express = require('express')
const bodyParser = require('body-parser')
// const cors = require('cors')
const { getCurrentInvoke } = require('@vendia/serverless-express')
const app = express()
const router = express.Router()


// router.use(cors())
router.use(bodyParser.json())
router.use(bodyParser.urlencoded({ extended: true }))

router.get('/api', (req, res) => {
  res.json({
    success: 'get call succeed!',
    // data: data[0],
    url: req.url
  });
})


// The serverless-express library creates a server and listens on a Unix
// Domain Socket for you, so you can remove the usual call to app.listen.
// app.listen(3000)
app.use('/', router)

// Export your express server so you can import it in the lambda function.
module.exports = app
