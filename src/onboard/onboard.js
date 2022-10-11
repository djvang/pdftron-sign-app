import { init } from "@web3-onboard/react";
import injectedModule from "@web3-onboard/injected-wallets";

import blocknativeLogo from "./icons/blocknative-logo";
import blocknativeIcon from "./icons/blocknative-icon";

const INFURA_ID = "a91ff9fd5fee4f1fa87f6f04e0823e80";

const chains = [
  {
    id: "0x1",
    token: "ETH",
    label: "Ethereum",
    rpcUrl: `https://mainnet.infura.io/v3/${INFURA_ID}`,
  },
  {
    id: "0x3",
    token: "tROP",
    label: "Ropsten",
    rpcUrl: `https://ropsten.infura.io/v3/${INFURA_ID}`,
  },
  {
    id: "0x4",
    token: "rETH",
    label: "Rinkeby",
    rpcUrl: `https://rinkeby.infura.io/v3/${INFURA_ID}`,
  },
  {
    id: "0x38",
    token: "BNB",
    label: "Binance",
    rpcUrl: "https://bsc-dataseed.binance.org/",
  },
  {
    id: "0x89",
    token: "MATIC",
    label: "Polygon",
    rpcUrl: "https://matic-mainnet.chainstacklabs.com",
  },
  {
    id: "0xfa",
    token: "FTM",
    label: "Fantom",
    rpcUrl: "https://rpc.ftm.tools/",
  },
];
const wallets = [injectedModule()];

export const web3Onboard = init({
  wallets,
  chains,
  appMetadata: {
    name: "Sign App",
    icon: blocknativeIcon,
    logo: blocknativeLogo,
    description: "Sign App",
    recommendedInjectedWallets: [
      { name: "Coinbase", url: "https://wallet.coinbase.com/" },
      { name: "MetaMask", url: "https://metamask.io" },
    ],
  },
});
