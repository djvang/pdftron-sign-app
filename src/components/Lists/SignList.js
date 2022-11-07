import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Button,
  Table,
  Text,
  Spinner,
  Modal,
  Flex,
  Heading,
  IconButton,
  TextField,
} from "gestalt";
import "gestalt/dist/gestalt.css";
import { useDispatch, useSelector } from "react-redux";
import { searchForDocumentToSign } from "../../firebase/firebase";
import { selectUser } from "../../firebase/firebaseSlice";
import { setDocToSign } from "../SignDocument/SignDocumentSlice";
import { setDocToView } from "../ViewDocument/ViewDocumentSlice";
import { navigate } from "@reach/router";
import { useQuery } from "@apollo/client";
import { QUERY_CONTRACTS } from "../../composedb/composedb";
import { selectKey, setKey } from "../Assign/AssignSlice";
import { useConnectWallet } from "@web3-onboard/react";
import { ethers } from "ethers";
import { useLit } from "../../lit/context";
import { logout } from "../../lit/lit";

const truncateAddress = (address, length = 6) => {
  if (!address) return "No Account";
  const reg = new RegExp(
    `(0x[a-zA-Z0-9]{${length}})[a-zA-Z0-9]+([a-zA-Z0-9]{${length}})`
  );
  const match = address.match(reg);
  if (!match) return address;
  return `${match[1]}…${match[2]}`;
};

function PasswordModal({ onClose, onSend }) {
  const key = useSelector(selectKey);
  const dispatch = useDispatch();

  const handleKey = (event) => {
    dispatch(setKey({ value: event.value }));
  };

  console.log({ key });

  return (
    <Modal
      closeOnOutsideClick={onClose}
      accessibilityModalLabel="Choose how to claim site"
      align="start"
      heading={
        <Box padding={6}>
          <Flex justifyContent="between">
            <Heading size="500" accessibilityLevel={1}>
              Decrypt Contract
            </Heading>
            <IconButton
              accessibilityLabel="Dismiss modal"
              bgColor="white"
              icon="cancel"
              iconColor="darkGray"
              onClick={onClose}
              size="sm"
            />
          </Flex>
        </Box>
      }
      size="sm"
      footer={
        <Flex justifyContent="end" gap={2}>
          <Button onClick={onClose} color="gray" text="Cancel" />
          <Button onClick={onSend} color="red" text="Send" />
        </Flex>
      }
    >
      <Box padding={6}>
        <Box marginBottom={4}>Input password to decrypt the contract.</Box>
        <TextField
          id="password"
          onChange={handleKey}
          placeholder="Enter password"
          value={key}
          type="password"
        />
      </Box>
    </Modal>
  );
}

const SignList = () => {
  const [{ wallet, connecting }, connect, disconnect] = useConnectWallet();
  const [litAuth, setLitAuth] = useState(false);
  const key = useSelector(selectKey);

  const [status, setStatus] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const user = useSelector(selectUser);
  const { email } = user;

  const [docs, setDocs] = useState([]);
  const [show, setShow] = useState(true);

  const dispatch = useDispatch();

  const { loading, error, data } = useQuery(QUERY_CONTRACTS, {
    skip: !user,
  });

  console.log("QUERY_CONTRACTS: ", { loading, error, data });

  let ethersProvider;
  if (wallet) {
    ethersProvider = new ethers.providers.Web3Provider(wallet.provider, "any");
  }
  const { getAuthSig, generateLitSignature } = useLit();

  useEffect(() => {
    setLitAuth(getAuthSig());
  }, [getAuthSig]);

  console.log({ wallet, user, litAuth });

  useEffect(() => {
    async function getDocs() {
      const getContractsByUser = (contracts) =>
        contracts?.filter(
          (contract) =>
            contract.node.signers?.some(
              ({ address }) =>
                address?.toLowerCase() === user?.email?.toLowerCase()
            ) ||
            contract.node.initiator.id
              ?.toLowerCase()
              .endsWith(user?.email?.toLowerCase())
        );

      const mapContractsByStepsOfSigned = (contracts) =>
        contracts?.map((contract) => {
          const steps = contract.node.steps?.edges?.map((edge) => edge.node);

          const signers = contract.node.signers.map((signer) => {
            const signed = steps.some((step) => {
              return step?.signer?.id
                ?.toLowerCase()
                .endsWith(signer?.address?.toLowerCase());
            });

            return {
              ...signer,
              __signed: signed,
            };
          });

          return {
            ...contract,
            node: {
              ...contract.node,
              signers,
            },
          };
        });

      const mapContractsByStatusOfSigned = (contracts) =>
        contracts?.map((contract) => {
          const steps = contract.node.steps?.edges?.map((edge) => edge.node);
          const signed =
            contract.node.signers.reduce((acc, signer) => {
              const signed = steps.some((step) => {
                return step?.signer?.id
                  ?.toLowerCase()
                  .endsWith(signer?.address?.toLowerCase());
              });

              if (signed) {
                return ++acc;
              }

              return acc;
            }, 0) === contract.node.signers.length;

          return {
            ...contract,
            node: {
              ...contract.node,
              __signed: signed,
            },
          };
        });

      const docsToSign = getContractsByUser(
        mapContractsByStatusOfSigned(
          mapContractsByStepsOfSigned(data.contractIndex.edges)
        )
      );

      console.log("query docs");

      setDocs(docsToSign);
      setShow(false);
    }

    if (user && !loading && !error) {
      getDocs();
    }
  }, [user, loading, data]);

  console.log({ docs, user });

  const filteredUnsignedDocs = docs?.filter((doc) => !doc.node.__signed);

  // navigate(`/viewDocument`);
  // navigate(`/signDocument`);

  return (
    <div>
      {show ? (
        <Spinner show={show} accessibilityLabel="spinner" />
      ) : (
        <div>
          {showModal && (
            <PasswordModal
              key="modal-password"
              onClose={() => setShowModal(false)}
              onSend={() => {
                setShowModal(false);
                if (status === "sign") {
                  navigate(`/signDocument`);
                }

                if (status === "view") {
                  navigate(`/viewDocument`);
                }
              }}
            />
          )}
          {filteredUnsignedDocs.length > 0 ? (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>
                    <Text weight="bold">From</Text>
                  </Table.HeaderCell>
                  <Table.HeaderCell>
                    <Text weight="bold">Signers</Text>
                  </Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredUnsignedDocs.map((doc) => {
                  console.log({ doc });

                  const userID = user.email.toLowerCase();

                  const initiator = doc.node.initiator.id
                    .toLowerCase()
                    .endsWith(userID);

                  const signed = doc.node.signers.find(
                    ({ address }) => address.toLowerCase() === userID
                  );

                  const isView =
                    (initiator === true && !!signed === false) ||
                    signed?.__signed;

                  console.log({
                    initiator,
                    signer: signed,
                    signed: signed?.__signed,
                    isView,
                  });

                  return (
                    <Table.Row key={doc.node.id}>
                      <Table.Cell>
                        <Text>
                          {truncateAddress(doc?.node?.initiator?.id)} (
                          {doc?.node?.encypted === 0
                            ? "not encrypted"
                            : doc?.node?.encypted === 1
                            ? "password"
                            : doc?.node?.encypted === 2
                            ? "lit protocol"
                            : ""}
                          )
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text>
                          {/* {doc?.requestedTime
                            ? new Date(
                                doc.requestedTime.seconds * 1000
                              ).toDateString()
                            : ""} */}
                          {doc.node.signers.map((signer) => (
                            <Text key={signer.address}>
                              {truncateAddress(signer.address)}:{" "}
                              {signer.__signed ? "signed" : "unsigned"}
                            </Text>
                          ))}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        {isView ? (
                          <Button
                            onClick={async (event) => {
                              dispatch(setKey({ value: "" }));
                              const { id } = doc?.node;

                              if (doc.node.encypted === 1) {
                                setShowModal(true);
                                dispatch(setDocToView({ id }));
                                setStatus("view");
                              } else if (doc.node.encypted === 2) {
                                // logout();
                                // setLitAuth(false);
                                if (wallet && ethersProvider) {
                                  /** Generate the signature for Lit */
                                  let resLitSig = await generateLitSignature(
                                    wallet.provider,
                                    wallet?.accounts?.[0]?.address
                                  );
                                  console.log({ resLitSig });

                                  if (resLitSig.status === 200) {
                                    setLitAuth(true);
                                    dispatch(setDocToView({ id }));
                                    setStatus("view");
                                    navigate(`/viewDocument`);
                                  }
                                }
                              } else {
                                dispatch(setDocToView({ id }));
                                setStatus("view");
                                navigate(`/viewDocument`);
                              }
                            }}
                            text="View"
                            color="gray"
                            inline
                          />
                        ) : (
                          <Button
                            onClick={async (event) => {
                              dispatch(setKey({ value: "" }));
                              const { id } = doc?.node;

                              if (doc.node.encypted === 1) {
                                setShowModal(true);
                                dispatch(setDocToSign({ id }));
                                setStatus("sign");
                              } else if (doc.node.encypted === 2 && !litAuth) {
                                if (wallet && ethersProvider) {
                                  /** Generate the signature for Lit */
                                  let resLitSig = await generateLitSignature(
                                    wallet.provider,
                                    wallet?.accounts?.[0]?.address
                                  );
                                  console.log({ resLitSig });

                                  if (resLitSig.status === 200) {
                                    setLitAuth(true);
                                    dispatch(setDocToSign({ id }));
                                    setStatus("sign");
                                    navigate(`/signDocument`);
                                  }
                                }
                              } else {
                                dispatch(setDocToSign({ id }));
                                setStatus("sign");
                                navigate(`/signDocument`);
                              }
                            }}
                            text="Sign"
                            color="blue"
                            inline
                          />
                        )}
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table>
          ) : (
            "You do not have any documents to sign"
          )}
        </div>
      )}
    </div>
  );
};

export default SignList;
