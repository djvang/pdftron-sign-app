import React, { useRef, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { navigate } from "@reach/router";
import { Box, Column, Heading, Row, Stack, Button } from "gestalt";
import { selectDocToView } from "./ViewDocumentSlice";
import { storage } from "../../firebase/firebase";
import WebViewer from "@pdftron/webviewer";
import "gestalt/dist/gestalt.css";
import "./ViewDocument.css";
import { retrieveFiles } from "../../web3.storage/put-files";
import { QUERY_CONTRACT } from "../../composedb/composedb";
import { useQuery } from "@apollo/client";

const ViewDocument = () => {
  const [instance, setInstance] = useState(null);

  const doc = useSelector(selectDocToView);
  const { docRef } = doc;

  const contractQuery = useQuery(QUERY_CONTRACT, {
    skip: !doc.id,
    variables: { id: doc.id },
  });

  const viewer = useRef(null);

  useEffect(() => {
    if (contractQuery.data) {
      WebViewer(
        {
          path: "webviewer",
          disabledElements: [
            "ribbons",
            "toggleNotesButton",
            "contextMenuPopup",
          ],
        },
        viewer.current
      ).then(async (instance) => {
        // select only the view group
        instance.UI.setToolbarGroup("toolbarGroup-View");

        setInstance(instance);

        // load document
        // const storageRef = storage.ref();
        // const URL = await storageRef.child(docRef).getDownloadURL();
        // console.log(URL);
        // instance.Core.documentViewer.loadDocument(URL);

        console.log({ contractQuery });
        const files = await retrieveFiles(
          contractQuery.data?.contract?.contractHash
        );

        console.log({ files: files[0] });

        const URL = `https://${files[0].cid}.ipfs.w3s.link/`;

        instance.Core.documentViewer.loadDocument(URL);

        const steps = contractQuery?.data?.contract?.steps.edges;
        const xfdfData = contractQuery?.data?.contract.signers.reduce(
          (xfdfData, signer) => {
            const signerOfContract = signer?.address?.toLowerCase();

            console.log({ steps });

            steps.forEach((step) => {
              const signerOfStep = step?.node?.signer?.id?.toLowerCase();

              console.log({
                signerOfContract,
                signerOfStep,
              });
              if (signerOfStep?.includes(signerOfContract)) {
                xfdfData.push(step.node.xfdf);
              }
            });

            return xfdfData;
          },
          []
        );

        instance.Core.documentViewer.addEventListener(
          "annotationsLoaded",
          () => {
            xfdfData.forEach((xfdf) => {
              instance?.Core.annotationManager
                .importAnnotations(xfdf)
                .then((annotations) => {
                  const mapppedAnnotations = annotations.map((a) => {
                    a.ReadOnly = true;
                    a.Hidden = false;
                    return a;
                  });
                  instance?.Core.annotationManager.drawAnnotationsFromList(
                    mapppedAnnotations
                  );
                  instance.Core.documentViewer.refreshAll();
                });
            });
          }
        );
      });
    }
  }, [contractQuery.data]);

  const download = () => {
    instance.UI.downloadPdf(true);
  };

  const doneViewing = async () => {
    navigate("/");
  };

  return (
    <div className={"prepareDocument"}>
      <Box display="flex" direction="row" flex="grow">
        <Column span={2}>
          <Box padding={3}>
            <Heading size="md">View Document</Heading>
          </Box>
          <Box padding={3}>
            <Row gap={1}>
              <Stack>
                <Box padding={2}>
                  <Button
                    onClick={download}
                    accessibilityLabel="download signed document"
                    text="Download"
                    iconEnd="download"
                  />
                </Box>
                <Box padding={2}>
                  <Button
                    onClick={doneViewing}
                    accessibilityLabel="complete signing"
                    text="Done viewing"
                    iconEnd="check"
                  />
                </Box>
              </Stack>
            </Row>
          </Box>
        </Column>
        <Column span={10}>
          <div className="webviewer" ref={viewer}></div>
        </Column>
      </Box>
    </div>
  );
};

export default ViewDocument;
