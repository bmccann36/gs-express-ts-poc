import 'source-map-support/register'
import serverlessExpress from '@vendia/serverless-express'
import app from './app'
import { APIGatewayEventRequestContextV2, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
// const pgconnect = require('./pgconnect')

let serverlessExpressInstance: any


async function setup(
  event: APIGatewayProxyEvent,
  context: APIGatewayEventRequestContextV2) {
  console.log("INIT ASYNC SETUP \n");
  // const asyncValue = await pgconnect()
  console.log("ASYNC SETUP COMPLETE\n\n");
  serverlessExpressInstance = serverlessExpress({ app })
  return serverlessExpressInstance(event, context)
}

async function handler(event: APIGatewayProxyEvent, context: APIGatewayEventRequestContextV2)
  : Promise<APIGatewayProxyResult> {
  if (serverlessExpressInstance) return serverlessExpressInstance(event, context)
  return setup(event, context)
}

exports.main = handler
