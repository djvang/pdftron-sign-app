import { createContext, useContext } from "react";
import {
  connectLitClient,
  getLit,
  generateLitSignature,
  generateLitSignatureV2,
  getAuthSig,
  decryptString,
  decryptBlob,
  encryptString,
} from "./lit";

const LitContext = createContext();

export const LitProvider = ({ children }) => {
  /** Connect to Lit */
  connectLitClient();

  return (
    <LitContext.Provider
      value={{
        getLit,
        generateLitSignature,
        generateLitSignatureV2,
        getAuthSig,
        decryptString,
        decryptBlob,
        encryptString,
      }}
    >
      {children}
    </LitContext.Provider>
  );
};

export const useLit = () => {
  const lit = useContext(LitContext);
  return lit;
};
