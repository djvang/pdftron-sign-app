import { createContext, useContext } from "react";
import { Ceramic } from "./ceramic";

const CeramicContext = createContext();

export const CeramicProvider = ({ children }) => {
  const ceramic = new Ceramic({
    node: "http://localhost:7007",
  });

  return (
    <CeramicContext.Provider value={ceramic}>
      {children}
    </CeramicContext.Provider>
  );
};

export const useCeramic = () => {
  const ceramic = useContext(CeramicContext);
  return ceramic;
};
