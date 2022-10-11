import React, { useEffect, useState } from "react";
import { Button, Table, Text, Spinner } from "gestalt";
import "gestalt/dist/gestalt.css";
import { useSelector, useDispatch } from "react-redux";
import { searchForDocumentsSigned } from "../../firebase/firebase";
import { selectUser } from "../../firebase/firebaseSlice";
import { setDocToView } from "../ViewDocument/ViewDocumentSlice";
import { navigate } from "@reach/router";
import { useQuery } from "@apollo/client";
import { QUERY_CONTRACTS } from "../../composedb/composedb";

const truncateAddress = (address, length = 6) => {
  if (!address) return "No Account";
  const reg = new RegExp(
    `(0x[a-zA-Z0-9]{${length}})[a-zA-Z0-9]+([a-zA-Z0-9]{${length}})`
  );
  const match = address.match(reg);
  if (!match) return address;
  return `${match[1]}…${match[2]}`;
};

const SignedList = () => {
  const user = useSelector(selectUser);
  const { email } = user;

  const [docs, setDocs] = useState([]);
  const [show, setShow] = useState(true);

  const dispatch = useDispatch();

  const { loading, error, data } = useQuery(QUERY_CONTRACTS, {
    skip: !user,
  });

  console.log("QUERY_CONTRACTS: ", { loading, error, data });

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

    if (user && !loading && data?.contractIndex?.edges?.length > 0) {
      getDocs();
    }
  }, [user, loading, data]);

  console.log({ docs, user });

  const filteredSignedDocs = docs?.filter((doc) => doc.node.__signed);

  return (
    <div>
      {show ? (
        <Spinner show={show} accessibilityLabel="spinner" />
      ) : (
        <div>
          {filteredSignedDocs.length > 0 ? (
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
                {filteredSignedDocs.map((doc) => (
                  <Table.Row key={doc.node.id}>
                    <Table.Cell>
                      {truncateAddress(doc.node.initiator.id)}
                    </Table.Cell>
                    <Table.Cell>
                      {/* <Text>{doc?.signedTime ? new Date(doc.signedTime.seconds*1000).toDateString() : ''}</Text> */}
                      {doc.node.signers.map((signer) => (
                        <Text key={signer.address}>
                          {truncateAddress(signer.address)}:{" "}
                          {signer.__signed ? "signed" : "unsigned"}
                        </Text>
                      ))}
                    </Table.Cell>
                    <Table.Cell>
                      <Button
                        onClick={(event) => {
                          const { id } = doc?.node;
                          dispatch(setDocToView({ id }));
                          navigate(`/viewDocument`);
                        }}
                        text="View"
                        color="gray"
                        inline
                      />
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          ) : (
            "You do not have any documents to review"
          )}
        </div>
      )}
    </div>
  );
};

export default SignedList;
