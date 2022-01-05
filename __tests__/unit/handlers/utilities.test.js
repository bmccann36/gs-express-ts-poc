const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');
const utils = require('../../../src/handlers/utilities');
// eslint-disable-next-line import/no-dynamic-require
const keys = require(`../../../src/config/cognito-web-keys-${ process.env.COGNITO_ENV || 'dev' }`);

jest.mock('jsonwebtoken');
jest.mock('jwk-to-pem');

describe('Utils', () => {
  describe('decodeAndVerifyToken', () => {
    it('returns a decoded jwt', () => {
      // Arrange
      // eslint-disable-next-line max-len
      const token = 'eyJraWQiOiJcL2xOQ1BmQ2hHaFRta2hcL3lpTlJhdFdNTlJIR1wvRDdsY1ZxYzAyc0NrSHRRPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJiYjA1Yjc1Ni03YjE1LTQ5ZmYtYTI1MS02OGI5ZDg0YTMzZTYiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiaXNzIjoiaHR0cHM6XC9cL2NvZ25pdG8taWRwLnVzLWVhc3QtMi5hbWF6b25hd3MuY29tXC91cy1lYXN0LTJfek5ucFVFa001IiwicGhvbmVfbnVtYmVyX3ZlcmlmaWVkIjpmYWxzZSwiY29nbml0bzp1c2VybmFtZSI6ImJiMDViNzU2LTdiMTUtNDlmZi1hMjUxLTY4YjlkODRhMzNlNiIsIm9yaWdpbl9qdGkiOiJiM2VkMjQ1MC1jY2MwLTQ5NmEtYTBiNi1hMjQxYTQwZGNhMmMiLCJhdWQiOiI3MWsxMjJtaGVvYTd1dXA1aXQ5ZTlzbmxqayIsImV2ZW50X2lkIjoiODAwNzEzYzktNThiMS00MjI4LWI1NjAtYzQ5ZmRkMDY3YzNmIiwidG9rZW5fdXNlIjoiaWQiLCJhdXRoX3RpbWUiOjE2MzQ2NzgyOTcsInBob25lX251bWJlciI6IisxNjA3MjIxNDcyNyIsImV4cCI6MTYzNDY4MTg5OCwiaWF0IjoxNjM0Njc4Mjk4LCJqdGkiOiJlZmU4NjU0Ni03NGE2LTRkYjMtYWU5NS0xOGFhNDEzZTQxYmYiLCJlbWFpbCI6ImRhbmllbC5kYXVnaGVydHlAZ3JlZW5zcGFya3NvZnR3YXJlLmNvbSJ9.wywDZiANoLvmCefq1kxkvS1ilduirqzshanAwqtWpgnvhN8fQGe4WsarqwOnKATto9589eYXQF6rZCe8Wu0SUT9OR28h5TZYCI7olS6XbpH7FfwkElFWalXN1e1ZgMJLwKuWXemwnSnwQxMNkEubYxbwe-VveX_LBZLWQqatRLn6VxuZpNKcjXQtKXFkq-2l9N0MKy4Phi2j6BW-XIY-2AbyApW-zHm0FHmjgrWwsibz_vkpfDQHP6np089aSOqDb17HiXJw1p2ptM1KJQu1F1t5WLclHxp6Vhsk0ps3dNp8ehKUVE-nva2cZa-1f7Q2p-Uh1lQDdGA7ktnzs9XgOQ';
      const pemMock = 'test';
      jwkToPem.mockReturnValueOnce(pemMock);
      // Act
      utils.decodeAndVerifyJwt(token);
      // Assert
      expect(jwkToPem.mock.calls.length).toBe(1);
      expect(keys).toContain(jwkToPem.mock.calls[ 0 ][ 0 ]);
      expect(jwt.verify.mock.calls.length).toBe(1);
      expect(jwt.verify.mock.calls[ 0 ][ 0 ]).toBe(token);
      expect(jwt.verify.mock.calls[ 0 ][ 1 ]).toBe(jwkToPem.mock.results[ 0 ].value);
      expect(jwt.verify.mock.calls[ 0 ][ 2 ]).toStrictEqual({ algorithms: [ 'RS256' ] });
    });
  });
});
