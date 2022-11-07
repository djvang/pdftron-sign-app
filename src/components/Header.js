import React from "react";
import { Flex, Box, Column, Heading } from "gestalt";
import "gestalt/dist/gestalt.css";
import SelectWallet from "../onboard/SelectWallet";

const Header = () => {
  return (
    <Box display="flex" direction="row" paddingY={2} color={"lightGray"}>
      <Column span={10}>
        <Box padding={3}>
          <Heading size="lg">Sign App</Heading>
        </Box>
      </Column>
      <Column>{/* <SelectWallet /> */}</Column>
    </Box>
  );
};

export default Header;
