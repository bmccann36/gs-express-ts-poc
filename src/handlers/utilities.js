const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');
// eslint-disable-next-line import/no-dynamic-require
const jwks = require(`../config/cognito-web-keys-${ process.env.COGNITO_ENV || 'dev' }`);

function getS3params() {
  const S3 = new AWS.S3();
  const params = {
    Bucket: 'aws-us-east-2-088407289953-greenspark-aws-pipe',
    Key: 'upload.csv',
  };
  const updateParams = {
    Bucket: 'aws-us-east-2-088407289953-greenspark-aws-pipe',
    Key: 'material_type_update.csv',
  };
  return { S3, params, updateParams };
}

function getQueryParams(event) {
  const page = ( event.queryStringParameters && event.queryStringParameters.page &&
    !Number.isNaN(event.queryStringParameters.page) ) ?
    parseInt(event.queryStringParameters.page, 10) : undefined;
  const pageSize = ( event.queryStringParameters && event.queryStringParameters.pageSize &&
      !Number.isNaN(event.queryStringParameters.pageSize) ) ?
    parseInt(event.queryStringParameters.pageSize, 10) : undefined;
  const fromKey = ( event.queryStringParameters && event.queryStringParameters.fromKey ) ?
    event.queryStringParameters.fromKey : '';
  const filter = ( event.queryStringParameters && event.queryStringParameters.filter ) ?
    JSON.parse(event.queryStringParameters.filter) : {};
  const sort = ( event.queryStringParameters && event.queryStringParameters.sort ) ?
    JSON.parse(event.queryStringParameters.sort) : {};
  return { page, pageSize, fromKey, filter, sort };
}

function getUserInfo(event) {
  if (event.headers && event.headers.Organization) {
    const organization = ( event.headers && event.headers.Organization ) ? event.headers.Organization : 'lopez';
    const yard = ( event.headers && event.headers.Yard ) ? event.headers.Yard : 'houston';
    const userId = ( event.headers && event.headers.Userid ) ? event.headers.Userid : 'tester';
    return { organization, yard, userId };
  }
  const organization = ( event.headers && event.headers.organization ) ? event.headers.organization : 'lopez';
  const yard = ( event.headers && event.headers.yard ) ? event.headers.yard : 'houston';
  const userId = ( event.headers && event.headers.userId ) ? event.headers.userId : 'tester';
  return { organization, yard, userId };
}

function getDefaultOrganizationInfoWithUserId(userId) {
  if (process.env.USE_DYNAMODB !== '1' || process.env.LOCAL_DYNAMODB === '1') {
    return {
      userId,
      organization: 'hulk_smash',
      yard: 'yard1',
    };
  }
  return {
    userId,
    yard: 'houston',
    organization: 'lopez',
  };
}

function getCorsHeaders() {
  return {
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,' +
    'X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
  };
}

function isEmpty(obj) { return Object.keys(obj).length === 0; }

function createResponse(msg, statusCode = 200) {
  const noPayload = [ 204, 205 ].includes(statusCode) || (statusCode >= 100 && statusCode < 200);
  const shouldStringify = msg !== undefined && msg !== null;
  let body;
  if (noPayload) {
    body = undefined;
  } else if (!shouldStringify) {
    body = msg;
  } else {
    body = JSON.stringify(msg);
  }
  return {
    statusCode,
    headers: getCorsHeaders(),
    body,
  };
}

function createErrorResponse(error, statusCode = 500) {
  return {
    statusCode,
    headers: getCorsHeaders(),
    body: JSON.stringify({ error: error.message }),
  };
}

function handler(func) {
  return event => {
    const orgInfo = module.exports.getUserInfo(event);
    const user = process.env.AUTHORIZATION_DISABLED === '1' ?
      { sub: '00000000-0000-0000-0000-000000000000' } :
      module.exports.decodeAndVerifyJwt(event.headers.Authorization.split(' ')[ 1 ]);
    const eventPrepared = {
      ...event,
      body: event.body && JSON.parse(event.body),
      user: {
        organization: orgInfo.organization,
        yard: orgInfo.yard,
        userId: user.sub,
        ...user,
      },
    };
    return func(eventPrepared).catch(err => createErrorResponse(err, err.isJoi ? 400 : 500));
  };
}

function decodeAndVerifyJwt(token) {
  const headers = JSON.parse(Buffer.from(token.split('.')[ 0 ], 'base64').toString());
  const jwk = jwks.find(key => key.kid === headers.kid);
  const pem = jwkToPem(jwk);
  return jwt.verify(token, pem, { algorithms: [ headers.alg ] });
}

module.exports = {
  getDefaultOrganizationInfoWithUserId,
  getQueryParams,
  getUserInfo,
  getCorsHeaders,
  isEmpty,
  createResponse,
  createErrorResponse,
  handler,
  decodeAndVerifyJwt,
  getS3params,
};
