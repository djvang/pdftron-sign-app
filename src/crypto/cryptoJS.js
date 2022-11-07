import CryptoJS from "crypto-js";
import { Buffer } from "buffer";
// Using the CryptoJS.AES symmetric encryption algorithm

// file: Blob, key: string (password)
export const getEncryptedStringFromFile = async (file, key) => {
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = async (fileEvent) => {
      const buffer = Buffer.from(fileEvent.target?.result);
      const encryptedString = getEncryptedStringFromBuffer(buffer, key);
      resolve(encryptedString);
    };
    reader.onerror = () => {
      reject("oops, something went wrong with the file reader.");
    };
    reader.readAsArrayBuffer(file);
  });
};

// buffer: Buffer, key: string (password)
export const getEncryptedStringFromBuffer = (buffer, key) => {
  const encryptedString = CryptoJS.AES.encrypt(
    JSON.stringify(buffer),
    key
  ).toString();
  return encryptedString;
};

export const decryptDataArrayFromStringAES = (encryptedString, key = "") => {
  const bytes = CryptoJS.AES.decrypt(encryptedString, key);
  const decrypted = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  const decryptedDataArray = new Uint8Array(decrypted.data);
  return decryptedDataArray;
};

/**

** Example encrypt blob file and xdf string
-----------------------------------

let encryptionKey = ''; // AES encryption key (password)

// encrypted file string
const encryptedFile = await getEncryptedStringFromFile(fileBlob, encryptionKey);
// encrypted signature string
const encryptedSignature = CryptoJS.AES.encrypt(fdfString, encryptionKey).toString();

// payload to be uploaded on arweave via new storage service
// breaking changes introduced for one-tap encryption
// ver 4.1 indicates one-tap encryption breaking on payload
const payload = {
  recipientKeys: recipientKeys,
  fileStr: encryptedFile,
  fdfString: encryptedSignature,
  meta: {
    version: '4.1' // increase the version when breaking changes introduced
  }
};

**/

/**

** Example dencrypt blob file and xdf string
-----------------------------------


// decrypt file data with encryptionKey (decryptedMessage)
const fileBlob = decryptDataArrayFromStringAES(fileStr, encryptionKey);
const file = new File([fileBlob], 'sample.pdf');

// decrypt signature data with encryptionKey (decryptedMessage)
const bytes = CryptoJS.AES.decrypt(fdfString, encryptionKey);
const signatureString = bytes.toString(CryptoJS.enc.Utf8);

const result = {
  files: [file],
  fdfString: signatureString,
};

**/

/**

Example of create hash from data


// Create an ordered array of the given input (of the form [[key:string, value:string], ...])
export const objToSortedArray = (obj) => {
  const keys = Object.keys(obj).sort();
  return keys.reduce((out, key) => {
    out.push([key, obj[key]]);
    return out;
  }, []);
};

// --- Base64 encoding
import * as base64 from "@ethersproject/base64";

// --- Crypto lib for hashing
import { createHash } from "crypto";
// Generate a hash like SHA256(DELEGATE_PRIVATE_KEY+PII), where PII is the (deterministic) JSON representation
  // of the PII object after transforming it to an array of the form [[key:string, value:string], ...]
  // with the elements sorted by key
export const getHash = (record, key) => base64.encode(
    createHash("sha256")
      .update(key, "utf-8")
      .update(JSON.stringify(objToSortedArray(record)))
      .digest()
  );


**/
