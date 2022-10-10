import { Web3OnboardProvider } from "@web3-onboard/react";
import { web3Onboard } from "./onboard";

export const OnboardProvider = ({ children }) => {
  return (
    <Web3OnboardProvider web3Onboard={web3Onboard}>
      {children}
    </Web3OnboardProvider>
  );
};
