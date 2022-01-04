const serverless = require('serverless-http');
const express = require('express');

const app = new express();

app.get('/', (req, res) => {
    res.send('Hello World')
});

app.get('/test', (req, res) => {
  res.send('this is a test')
});

module.exports.lambdaHandler = serverless(app);