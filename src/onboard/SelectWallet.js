import { Box, Button, Container } from "gestalt";

import { useConnectWallet } from "@web3-onboard/react";
import { ethers } from "ethers";
import { useCeramic } from "../ceramic/context";
import { useDispatch } from "react-redux";
import { setUser } from "../firebase/firebaseSlice";
import { useCompose } from "../composedb/composedb";

const SelectWallet = () => {
  const [{ wallet, connecting }, connect, disconnect] = useConnectWallet();
  const ceramic = useCeramic();
  const { connect: connectCompose } = useCompose();

  const dispatch = useDispatch();

  let ethersProvider;

  if (wallet) {
    ethersProvider = new ethers.providers.Web3Provider(wallet.provider, "any");
  }

  const handleConnect = async () => {
    const connectedOnboard = await connect(ethersProvider);
    const connectedCompose = await connectCompose(
      connectedOnboard?.[0].provider
    );
    // const connectedCeramic = await ceramic.connect(
    //   ethersProvider
    //   );

    console.log({ connectedOnboard, connectedCompose });
    const account = connectedOnboard?.[0]?.accounts?.[0];

    dispatch(
      setUser({
        uid: account.address,
        displayName: account.address,
        ens: account.ens,
        balance: account.balance,
        email: account.address,
        photoURL: "",
        did: connectedCompose.did,
      })
    );
  };

  const handleDisconnect = async (wallet) => {
    await disconnect(wallet);
    ceramic.logout();
    dispatch(setUser(null));
  };

  return (
    <div>
      <Box marginTop={4}>
        <Container>
          {" "}
          <Button
            className="bn-demo-button"
            onClick={async () =>
              wallet ? await handleDisconnect(wallet) : await handleConnect()
            }
            text={connecting ? "Connecting" : wallet ? "Disconnect" : "Connect"}
            color="blue"
            inline
          ></Button>
        </Container>
      </Box>
    </div>
  );
};

export default SelectWallet;
