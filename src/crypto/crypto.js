const crypto = require("crypto");
const ethers = require("ethers");

/**
 * Create symmetric key for file encryption
 * @param password: {String}
 * @returns {null|Buffer}
 */
export const generateCipherKey = function (password) {
  try {
    return new Promise((resolve) => {
      const cipherKey = crypto.createHash("sha256").update(password).digest();
      console.log("AES Key:", cipherKey);
      resolve(cipherKey);
    });
  } catch (err) {
    console.error("Error while generating symmetric key:", err);
    return null;
  }
};

export const encryptFile = function (file, cipherKey) {
  return new Promise((resolve) => {
    let iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes256", cipherKey, iv);
    const encryptedData = Buffer.concat([
      iv,
      cipher.update(file),
      cipher.final(),
    ]);

    resolve(encryptedData);
  });
};

export const calculateHash = function (file) {
  // return crypto.createHash('sha256').update(file.toString()).digest()
  return ethers.utils.keccak256(file);
};

export const decryptFile = async function (encryptedData, cipherKey) {
  const iv = encryptedData.slice(0, 16);
  encryptedData = encryptedData.slice(16);
  return new Promise((resolve) => {
    const decipher = crypto.createDecipheriv("aes256", cipherKey, iv);
    const decryptedData = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final(),
    ]);
    resolve(decryptedData);
  });
};
