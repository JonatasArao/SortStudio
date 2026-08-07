/**
 * Generates a cryptographically strong random value between 0 and 1 (inclusive of 0, exclusive of 1),
 * similar to Math.random() but using the Web Crypto API.
 */
export const getSecureRandom = (): number => {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  // Divide by 2^32 (4294967296) to get a value in [0, 1)
  return array[0] / 4294967296;
};

/**
 * Shuffles an array using the Fisher-Yates algorithm and secure randomness.
 */
export const secureShuffle = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(getSecureRandom() * (i + 1));
    const temp = newArray[i];
    newArray[i] = newArray[j];
    newArray[j] = temp;
  }
  return newArray;
};
