const {
  chunkArray,
  removeDuplicates,
  pick,
  omit,
  isValidEmail,
  buildQueryString,
  parseQueryString,
  calculateOffset,
  getPaginationMetadata,
  calculatePercentage,
} = require('./helpers');

describe('helpers', () => {
  test('chunkArray() splits array by size', () => {
    expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  test('removeDuplicates() removes primitive duplicates', () => {
    expect(removeDuplicates([1, 1, 2, 3, 3])).toEqual([1, 2, 3]);
  });

  test('removeDuplicates() removes duplicate objects by key', () => {
    const input = [
      { id: 1, name: 'A' },
      { id: 1, name: 'A2' },
      { id: 2, name: 'B' },
    ];
    expect(removeDuplicates(input, 'id')).toEqual([
      { id: 1, name: 'A' },
      { id: 2, name: 'B' },
    ]);
  });

  test('pick() returns only selected keys', () => {
    expect(pick({ a: 1, b: 2, c: 3 }, ['a', 'c'])).toEqual({ a: 1, c: 3 });
  });

  test('omit() removes selected keys', () => {
    expect(omit({ a: 1, b: 2, c: 3 }, ['b'])).toEqual({ a: 1, c: 3 });
  });

  test('isValidEmail() validates email format', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('invalid-email')).toBe(false);
  });

  test('buildQueryString() and parseQueryString() are compatible', () => {
    const query = buildQueryString({ page: '2', limit: '20', search: 'ali' });
    expect(parseQueryString(query)).toEqual({ page: '2', limit: '20', search: 'ali' });
  });

  test('calculateOffset() returns correct offset', () => {
    expect(calculateOffset(1, 20)).toBe(0);
    expect(calculateOffset(3, 20)).toBe(40);
  });

  test('getPaginationMetadata() returns expected metadata', () => {
    expect(getPaginationMetadata(95, 2, 10)).toEqual({
      total: 95,
      page: 2,
      limit: 10,
      totalPages: 10,
      hasMore: true,
      hasPrev: true,
    });
  });

  test('calculatePercentage() handles divide by zero safely', () => {
    expect(calculatePercentage(10, 0)).toBe(0);
    expect(calculatePercentage(25, 100)).toBe(25);
  });
});
