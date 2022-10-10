/** Ceramic */
import { CeramicClient } from "@ceramicnetwork/http-client";
import { TileDocument } from "@ceramicnetwork/stream-tile";
import { DIDSession } from "did-session";
import { EthereumAuthProvider } from "@ceramicnetwork/blockchain-utils-linking";

/** To generate dids from a Seed */
import { DID } from "dids";
import { Ed25519Provider } from "key-did-provider-ed25519";
import { getResolver } from "key-did-resolver";

import { fromString } from "uint8arrays";

import { DataModel } from "@glazed/datamodel";
import { DIDDataStore } from "@glazed/did-datastore";
import { TileLoader } from "@glazed/tile-loader";

const aliases = {
  definitions: {
    contracts:
      "kjzl6cwe1jw14bgs205hkqy0szyl5riofjqim63ggjhe90q2b2int19w2g0jjmt",
  },
  schemas: {
    Contract:
      "ceramic://k3y52l7qbv1fry8kjxj0rez4ome2xkyq52ujw4q1yebqkmh6k31jhnov1swa6nx8g",
    Contracts:
      "ceramic://k3y52l7qbv1fryk6gh2p7prvbln3c3k6z2j23cjjoxplzil3f0oduem4fqwgzwdfk",
  },
  tiles: {
    placeholderContract:
      "kjzl6cwe1jw1474ev6lnl0k1pk87ht3s7jgubn2vtyw5zbesb471le2upe4gfiy",
  },
};

/** Initiate the node URLs for the two networks */
const MAINNET_NODE_URL = "https://node1.orbis.club/";
const TESTNET_NODE_URL = "https://ceramic-clay.3boxlabs.com";
const SEED_DELEGATE =
  "d8b27095b522ad996a1a66ed9bf0f9eb3e629e2cc811667a744ec1f497b1a60f";

/** Set schemas Commit IDs */
const contractSchemaStream =
  "k3y52l7qbv1fry8kjxj0rez4ome2xkyq52ujw4q1yebqkmh6k31jhnov1swa6nx8g";
const contractsSchemaStream =
  "k3y52l7qbv1fryk6gh2p7prvbln3c3k6z2j23cjjoxplzil3f0oduem4fqwgzwdfk";

/** Definition of the Orbis class powering the Orbis SDK */
export class Ceramic {
  /** Initiate some values for the class */
  ceramic;
  session;
  loader;
  model;
  store;

  /**
   * Initialize the SDK by connecting to a Ceramic node, developers can pass their own Ceramic object if the user is
   * already connected within their application
   */
  constructor(options) {
    if (options && options.ceramic) {
      /** Initialize the Orbis object using the Ceramic object passed in the option */
      this.ceramic = options.ceramic;
    } else {
      /** Either connect to mainnet or testnet */
      if (options && options.node) {
        this.ceramic = new CeramicClient(options.node);
        console.log("Ceramic: Connected to node: " + options.node);
      } else {
        try {
          this.ceramic = new CeramicClient(MAINNET_NODE_URL);
          console.log("Ceramic: Connected to node: " + MAINNET_NODE_URL);
        } catch (e) {
          console.log("Error creating Ceramic object: ", e);
        }
      }
    }

    if (this.ceramic) {
      const ceramic = this.ceramic;
      const cache = new Map();

      const loader = new TileLoader({ ceramic, cache });
      const model = new DataModel({ loader, aliases });
      const store = new DIDDataStore({
        ceramic,
        loader,
        model,
      });

      this.loader = loader;
      this.model = model;
      this.store = store;
    }
  }

  /** The connect function will connect to an EVM wallet and create or connect to a Ceramic did */
  async connect(provider) {
    /** If provider isn't passed we use window.ethereum */
    if (!provider) {
      if (window.ethereum) {
        console.log(
          "Orbis SDK: You need to pass the provider as an argument in the `connect()` function. We will be using window.ethereum by default."
        );
        provider = window.ethereum;
      } else {
        alert(
          "An ethereum provider is required to proceed with the connection to Ceramic."
        );
        return false;
      }
    }

    /** Step 1: Enable Ethereum provider (can be browser wallets or WalletConnect for now) */
    let addresses;
    try {
      addresses = await provider.enable();
    } catch (e) {
      return {
        status: 300,
        error: e,
        result: "Error enabling Ethereum provider.",
      };
    }

    /** Step 2: Check if user already has an active account on Orbis */
    let authProvider;
    let address = addresses[0].toLowerCase();
    /*let {data: existingDids, error: errorDids}  = await getDids(address);
		if(errorDids) {
			console.log("Error retrieving existing dids: ", errorDids);
		}
		if(existingDids && existingDids.length > 0) {
			let _didArr = existingDids[0].did.split(":");
			let default_network = _didArr[2];
			if(default_network == "eip155") {
				let default_chain = _didArr[3];
				console.log("Default chain to use: ", default_chain);
			}
		} else {
		}*/

    /** Step 2: Create an authProvider object using the address connected */
    try {
      authProvider = new EthereumAuthProvider(provider, address);
    } catch (e) {
      return {
        status: 300,
        error: e,
        result: "Error creating Ethereum provider object for Ceramic.",
      };
    }

    /** Step 3: Create a new session for this did */
    let did;
    try {
      /** Expire session in 30 days by default */
      const oneMonth = 60 * 60 * 24 * 31;

      this.session = await DIDSession.authorize(authProvider, {
        resources: [`ceramic://*`],
        expiresInSecs: oneMonth,
      });
      did = this.session.did;
    } catch (e) {
      return {
        status: 300,
        error: e,
        result: "Error creating a session for the DiD.",
      };
    }

    /** Step 3 bis: Store session in localStorage to re-use */
    try {
      const sessionString = this.session.serialize();
      localStorage.setItem("ceramic-session", sessionString);
    } catch (e) {
      console.log("Error creating sessionString: " + e);
    }

    /** Step 4: Assign did to Ceramic object  */
    this.ceramic.did = did;

    /** Return result */
    return {
      status: 200,
      did: this.session.id,
      details: null,
      result: "Success connecting to the DiD.",
    };
  }

  /** Automatically reconnects to a session stored in localStorage, returns false if there isn't any session in localStorage */
  async isConnected() {
    await this.ceramic;

    /** Check if an existing session is stored in localStorage */
    let sessionString = localStorage.getItem("ceramic-session");
    if (!sessionString) {
      return false;
    }

    /** Connect to Ceramic using the session previously stored */
    try {
      this.session = await DIDSession.fromSession(sessionString, null);
      console.log("Reconnected to Ceramic automatically.");
    } catch (e) {
      console.log("Error reconnecting to Ceramic automatically: " + e);
      return false;
    }

    /** Check if session is expired */
    if (this.session.hasSession && this.session.isExpired) {
      return false;
    }

    /** Session is still valid, connect */
    try {
      this.ceramic.did = this.session.did;
    } catch (e) {
      console.log("Error assigning did to Ceramic object: " + e);
      return false;
    }

    /** Return result */
    return {
      status: 200,
      did: this.session.id,
      details: null,
      result: "Success re-connecting to the DiD.",
    };
  }

  /** Destroys the Ceramic session string stored in localStorage */
  logout() {
    try {
      localStorage.removeItem("ceramic-session");
      localStorage.removeItem("lit-auth-signature");
      return {
        status: 200,
        result: "Logged out from Orbis and Ceramic.",
      };
    } catch (e) {
      return {
        status: 300,
        error: e,
        result: "Error logging out.",
      };
    }
  }

  /** Authenticate a did with a seed */
  async connectWithSeed(seed) {
    /** Create the provider and resolve it */
    const provider = new Ed25519Provider(seed);
    const did = new DID({ provider, resolver: getResolver() });

    /** Authenticate the Did */
    await did.authenticate();
    console.log("did: ", did);

    /** Assign did to Ceramic object  */
    // this.ceramic.did = did;
    // this.session = {
    //   did: did,
    //   id: did.id,
    // };

    /** Return result */
    return {
      status: 200,
      did: did.id,
      details: null,
      result: "Success connecting to the did:key.",
    };
  }

  /***********************
   *** CERAMIC HELPERS ***
   **********************/

  /** Helper to create a basic TileDocument on Ceramic */
  async createTileDocument(
    controller,
    content,
    tags,
    schema,
    family = "delegate"
  ) {
    let res;

    /** Try to create TileDocument */
    try {
      let doc = await TileDocument.create(
        this.ceramic,
        /** Content of the post */
        content,
        /** Metadata */
        {
          family: family,
          controllers: [controller],
          tags: tags,
          schema: schema,
        }
      );

      /** Return JSON with doc object */
      res = {
        status: 200,
        doc: doc.id.toString(),
        result: "Success creating TileDocument.",
      };
    } catch (e) {
      console.log("Error creating TileDocument: ", e);
      res = {
        status: 300,
        error: e,
        result: "Error creating TileDocument.",
      };
    }

    /** Returning result */
    return res;
  }

  /** Helper to update an existing TileDocument */
  async updateTileDocument(
    controller,
    stream_id,
    content,
    tags,
    schema,
    family = "delegate"
  ) {
    let res;

    /** Try to update existing Ceramic document */
    let doc;
    try {
      doc = await TileDocument.load(this.ceramic, stream_id);
      await doc.update(content, {
        family: family,
        controllers: [controller],
        tags: tags,
        schema: schema,
      });

      /** Return JSON with doc object */
      res = {
        status: 200,
        doc: stream_id,
        result: "Success updating TileDocument.",
      };
    } catch (e) {
      res = {
        status: 300,
        error: e,
        result: "Error updating TileDocument.",
      };
    }

    /** Returning result */
    return res;
  }

  /** Helper to create a deterministic TileDocument on Ceramic */
  async deterministicDocument(
    controller,
    content,
    tags,
    schema,
    family = "delegate"
  ) {
    let res;

    /** Try to create/update a deterministic TileDocument */
    try {
      /** Retrieve or create deterministic document */
      const doc = await TileDocument.deterministic(this.ceramic, {
        family: family,
        controllers: [controller],
        tags: tags,
      });

      /** Update the document to add content */
      await doc.update(content, {
        family: family,
        controllers: [controller],
        tags: tags,
      });

      /** Return JSON with doc object */
      res = {
        status: 200,
        doc: doc.id.toString(),
        result: "Success creating or updating deterministic TileDocument.",
      };
    } catch (e) {
      res = {
        status: 300,
        error: e,
        result: "Error creating or updating deterministic TileDocument.",
      };
    }

    /** Returning result */
    return res;
  }

  // /** Connected users can share a new post following our schemas */
  // async createContract(content) {
  //   const stream = await this.store.set("Contract", { ...content });
  //   return stream.toUrl();
  // }

  // async getContracts() {
  //   const [contractsList] = await Promise.all([this.store.get("contracts")]);
  //   const contracts = contractsList?.contracts ?? [];

  //   return contracts;
  // }

  /** Connected users can share a new post following our schemas */
  async createContract(content) {
    /** Make sure post isn't empty */
    if (!content) {
      return {
        status: 300,
        result: "You can't share an empty post.",
      };
    }

    const seedDelegate = fromString(SEED_DELEGATE, "base16");
    // const connectedDelegate = this.connectWithSeed(seedDelegate);

    const provider = new Ed25519Provider(seedDelegate);
    const did = new DID({ provider, resolver: getResolver() });
    await did.authenticate();

    console.log({ did, session: this.session });

    /** Create tile with post schema */

    const contract = await this.createTileDocument(
      this.session.id,
      content,
      ["delegate", "contract"],
      contractSchemaStream
    );

    /** Return confirmation results */
    return contract;
  }

  async getContracts() {
    const [contractsList] = await Promise.all([this.store.get("contracts")]);
    const contracts = contractsList?.contracts ?? [];

    return contracts;
  }
}
