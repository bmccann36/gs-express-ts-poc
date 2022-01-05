const materialValidation = require('../../../../src/api/validations/material-validation');
const baseMaterial = require('../../../../src/api/models/memoryDatabase/material-list.json');

describe('Test Material Validation', () => {
  it('Missing MaterialTypeId', async () => {
    const payload = {
      id: 'bob',
    };
    const result = materialValidation.Validate(payload);
    expect(result).toHaveProperty('error');
    expect(result.error).toHaveProperty('name');
    expect(result.error.name).toBe('ValidationError');
    expect(result.error.message).toBe('"materialTypeId" is required');
  });
  it('Minimal Material Object', async () => {
    const payload = baseMaterial.Items[ 0 ];
    const result = materialValidation.Validate(payload);
    expect(result.error).toBeUndefined();
    expect(result.value).toStrictEqual(payload);
  });
});
