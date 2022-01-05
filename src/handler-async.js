// require('dotenv').config()
require('source-map-support/register')
const serverlessExpress = require('@vendia/serverless-express')
const app = require('./app')
const pgconnect = require('./pgconnect')

let serverlessExpressInstance


async function setup(event, context) {
  console.log("INIT ASYNC SETUP \n");
  const asyncValue = await pgconnect()
  console.log("ASYNC SETUP COMPLETE\n\n");
  serverlessExpressInstance = serverlessExpress({ app })
  return serverlessExpressInstance(event, context)
}

async function handler(event, context) {
  if (serverlessExpressInstance) return serverlessExpressInstance(event, context)
  return setup(event, context)
}

exports.main = handler
