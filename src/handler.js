require('source-map-support/register')
const serverlessExpress = require('@vendia/serverless-express')
const app = require('./app')

exports.main = serverlessExpress({ app })
