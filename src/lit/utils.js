/** Returns a JSON object with the address and network based on the did */
export function getAddressFromDid(did) {
  if (did && did.substring(0, 2) === "0x") {
    return {
      address: did,
      network: "eip155",
      chain: 1,
    };
  }

  if (did && did.substring(0, 7) === "did:pkh") {
    /** Explode address to retrieve did */
    let addressParts = did.split(":");
    if (addressParts.length >= 4) {
      let address = addressParts[4];
      let network = addressParts[2];
      let chain = addressParts[2] + ":" + addressParts[3];

      /** Return result */
      return {
        address: address,
        network: network,
        chain: chain,
      };
    } else {
      /** Return null object */
      return {
        address: null,
        network: null,
        chain: null,
      };
    }
  } else {
    /** Return null object */
    return {
      address: null,
      network: null,
      chain: null,
    };
  }
}

/**
 * This function converts blobs to base 64.
 * for easier storage in ceramic
 * @param {Blob} blob what you'd like to encode
 * @returns {Promise<String>} returns a string of b64
 */
export function blobToBase64(blob) {
  return new Promise((resolve, _) => {
    const reader = new FileReader();
    reader.onloadend = () =>
      resolve(
        reader.result.replace("data:application/octet-stream;base64,", "")
      );
    reader.readAsDataURL(blob);
  });
}

/** Decodes a b64 string */
export function decodeb64(b64String) {
  return new Uint8Array(Buffer.from(b64String, "base64"));
}

/** Turns a uint8array in a buffer */
export function buf2hex(buffer) {
  // buffer is an ArrayBuffer
  return [...new Uint8Array(buffer)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

/** Wait for x ms in an async function */
export const sleep = (milliseconds) => {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

/** To sort an array based on a specific key */
export function sortByKey(array, key) {
  return array.sort(function (a, b) {
    var x = a[key];
    var y = b[key];
    return x > y ? -1 : x < y ? 1 : 0;
  });
}
