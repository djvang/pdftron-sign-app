import { fromString } from "uint8arrays";

import { DataModel } from "@glazed/datamodel";
import { DIDDataStore } from "@glazed/did-datastore";
import { TileLoader } from "@glazed/tile-loader";

import { aliases } from "./__generated__/aliases";

import { createContext, useContext } from "react";
import { DID } from "dids";
import { Ed25519Provider } from "key-did-provider-ed25519";
import { getResolver } from "key-did-resolver";
import { CeramicClient } from "@ceramicnetwork/http-client";

const SEED_DELEGATE =
  "f6a860f31f6f5e221884da0ac43443d3f20ee6f4aa8f62f5cd78fc923d5ed12c";

const GlazedContext = createContext();

// Use shared cache
const cache = new Map();

export const GlazedProvider = async ({ children }) => {
  const seed = fromString(SEED_DELEGATE, "base16");

  const did = new DID({
    provider: new Ed25519Provider(seed),
    resolver: getResolver(),
  });

  await did.authenticate();

  // Create the Ceramic instance and inject the DID
  const ceramic = new CeramicClient("http://localhost:7007");
  ceramic.did = did;

  const loader = new TileLoader({ ceramic, cache });
  const model = new DataModel({ loader, aliases });
  const store = new DIDDataStore({ ceramic, loader, model });

  return (
    <GlazedContext.Provider
      value={{
        loader,
        model,
        store,
      }}
    >
      {children}
    </GlazedContext.Provider>
  );
};

export const useGlazed = () => {
  const glazed = useContext(GlazedContext);
  if (!glazed) {
    throw new Error("useGlazed must be used within GlazedContextProvider");
  }
  return glazed;
};
