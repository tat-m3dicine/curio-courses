import { expect } from 'chai';

export const tryAndExpect = async (testFunction: () => Promise<any>, errorType: any) => {
  try {
    await testFunction();
  } catch (error) {
    return expect(error).instanceOf(errorType);
  }
  return expect(() => undefined).to.throw(errorType);
};
