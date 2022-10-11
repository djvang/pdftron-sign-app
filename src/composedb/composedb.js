import React, { useContext, createContext } from "react";
import { ComposeClient } from "@composedb/client";
import { EthereumWebAuth, getAccountId } from "@didtools/pkh-ethereum";
import { DIDSession } from "did-session";
import { EthereumAuthProvider } from "@ceramicnetwork/blockchain-utils-linking";
import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
  ApolloProvider,
  gql,
} from "@apollo/client";
import definition from "./runtime-composite.json";

export const ComposeContext = createContext();

export const ComposeProvider = ({ children }) => {
  const compose = new ComposeClient({
    ceramic: "http://localhost:7007",
    definition,
  });

  // Create a custom ApolloLink using the ComposeClient instance to execute operations
  const link = new ApolloLink((operation) => {
    return new Observable((observer) => {
      compose.execute(operation.query, operation.variables).then(
        (result) => {
          observer.next(result);
          observer.complete();
        },
        (error) => {
          observer.error(error);
        }
      );
    });
  });

  const connect = async (provider) => {
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

    console.log({ authProvider });

    // const accountId = await getAccountId(provider, addresses[0]);
    // const authMethod = await EthereumWebAuth.getAuthMethod(
    //   authProvider,
    //   accountId
    // );

    /** Step 3: Create a new session for this did */
    let did;
    let session;
    try {
      /** Expire session in 30 days by default */
      const oneMonth = 60 * 60 * 24 * 31;

      session = await DIDSession.authorize(authProvider, {
        resources: [`ceramic://*`],
        expiresInSecs: oneMonth,
      });
      did = session.did;

      compose.setDID(session.did);
    } catch (e) {
      console.log("Error creating a session for the DiD: ", e);
    }

    /** Step 4: Assign did to Compose object  */
    return {
      status: 200,
      did: session.did,
      details: null,
      result: "Success connecting to the DiD.",
    };
  };

  const apolloClient = new ApolloClient({ cache: new InMemoryCache(), link });

  return (
    <ComposeContext.Provider value={{ compose, connect }}>
      <ApolloProvider client={apolloClient}>{children}</ApolloProvider>
    </ComposeContext.Provider>
  );
};

export const useCompose = () => {
  const { compose, connect } = useContext(ComposeContext);
  if (!compose) {
    throw new Error("useCompose must be used within ComposeContextProvider");
  }
  return { compose, connect };
};

export const QUERY_CONTRACTS_VIEWER = gql`
  query ContractsByViewer($cursor: String) {
    viewer {
      contractList(last: 5, before: $cursor) {
        edges {
          node {
            __typename
            id
            name
            xfdf
            contractHash
            initiator {
              id
            }
            signers {
              address
            }
            steps(first: 100) {
              edges {
                node {
                  contractHash
                  signer {
                    id
                  }
                }
              }
            }
          }
        }
        pageInfo {
          hasPreviousPage
          startCursor
        }
      }
    }
  }
`;

export const QUERY_CONTRACTS = gql`
  query Contracts($cursor: String) {
    contractIndex(first: 1000, before: $cursor) {
      edges {
        node {
          __typename
          id
          name
          xfdf
          contractHash
          initiator {
            id
          }
          signers {
            address
          }
          steps(first: 100) {
            edges {
              node {
                contractHash
                xfdf
                signer {
                  id
                }
              }
            }
          }
        }
      }
      pageInfo {
        hasPreviousPage
        startCursor
      }
    }
  }
`;

export const CREATE_CONTRACT = gql`
  mutation CreateContract($input: CreateContractInput!) {
    createContract(input: $input) {
      document {
        __typename
        id
        name
        xfdf
        contractHash
        initiator {
          id
        }
        signers {
          address
        }
      }
    }
  }
`;

export const QUERY_CONTRACT = gql`
  query Contract($id: ID!) {
    contract: node(id: $id) {
      ... on Contract {
        __typename
        id
        name
        xfdf
        contractHash
        initiator {
          id
        }
        signers {
          address
        }
        steps(first: 100) {
          edges {
            node {
              contractHash
              xfdf
              signer {
                id
              }
            }
          }
        }
      }
    }
  }
`;

export const UPDATE_CONTRACT = gql`
  mutation UpdateContract($input: UpdateContractInput!) {
    updateContract(input: $input) {
      document {
        __typename
        id
        name
        xfdf
        contractHash
        initiator {
          id
        }
        signers {
          address
        }
      }
    }
  }
`;

export const CREATE_CONTRACT_STEP = gql`
  mutation CreateContractStep($input: CreateContractStepInput!) {
    createContractStep(input: $input) {
      document {
        __typename
        id
        xfdf
        contractHash
        signer {
          id
        }
      }
    }
  }
`;
