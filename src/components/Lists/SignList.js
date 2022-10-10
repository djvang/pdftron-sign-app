import React, { useEffect, useState } from "react";
import { Button, Table, Text, Spinner } from "gestalt";
import "gestalt/dist/gestalt.css";
import { useDispatch, useSelector } from "react-redux";
import { searchForDocumentToSign } from "../../firebase/firebase";
import { selectUser } from "../../firebase/firebaseSlice";
import { setDocToSign } from "../SignDocument/SignDocumentSlice";
import { navigate } from "@reach/router";
import { useQuery } from "@apollo/client";
import { QUERY_CONTRACTS } from "../../composedb/composedb";

const SignList = () => {
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
        contracts?.filter((contract) =>
          contract.node.signers?.filter(
            ({ address }) =>
              address?.toLowerCase() === user?.email?.toLowerCase()
          )
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
              const isSigned = steps.find((step) => {
                return step?.signer?.id
                  ?.toLowerCase()
                  .endsWith(signer?.address?.toLowerCase());
              });

              if (isSigned) {
                return acc++;
              }

              return acc;
            }, 0) > 0;

          return {
            ...contract,
            node: {
              ...contract.node,
              __signed: signed,
            },
          };
        });

      const docsToSign = mapContractsByStatusOfSigned(
        mapContractsByStepsOfSigned(
          getContractsByUser(data.contractIndex.edges)
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

  return (
    <div>
      {show ? (
        <Spinner show={show} accessibilityLabel="spinner" />
      ) : (
        <div>
          {docs.length > 0 ? (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>
                    <Text weight="bold">From</Text>
                  </Table.HeaderCell>
                  <Table.HeaderCell>
                    <Text weight="bold">When</Text>
                  </Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {docs.map((doc) => {
                  console.log({ doc });

                  const signed = doc.node.signers.find(
                    ({ address }) =>
                      address.toLowerCase() === user.email.toLowerCase()
                  )?.__signed;

                  return (
                    <Table.Row key={doc.node.id}>
                      <Table.Cell>
                        <Text>{doc?.node?.initiator?.id}</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text>
                          {doc?.requestedTime
                            ? new Date(
                                doc.requestedTime.seconds * 1000
                              ).toDateString()
                            : ""}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        {signed ? (
                          <Button text="Signed" color="green" inline />
                        ) : (
                          <Button
                            onClick={(event) => {
                              const { id } = doc?.node;
                              dispatch(setDocToSign({ id }));
                              navigate(`/signDocument`);
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
