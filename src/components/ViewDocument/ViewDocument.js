import React, { useRef, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { navigate } from "@reach/router";
import {
  Box,
  Column,
  Heading,
  Flex as Row,
  Flex as Stack,
  Button,
} from "gestalt";
import { selectDocToView } from "./ViewDocumentSlice";
import { storage } from "../../firebase/firebase";
import WebViewer from "@pdftron/webviewer";
import "gestalt/dist/gestalt.css";
import "./ViewDocument.css";
import { retrieve, retrieveFiles } from "../../web3.storage/put-files";
import { QUERY_CONTRACT } from "../../composedb/composedb";
import { useQuery } from "@apollo/client";
import { selectKey } from "../Assign/AssignSlice";
import { decryptDataArrayFromStringAES } from "../../crypto/cryptoJS";
import cryptoJs from "crypto-js";
import { base64StringToBlob } from "lit-js-sdk";
import { decryptFile, decryptString } from "../../lit/lit";

const ViewDocument = () => {
  const key = useSelector(selectKey);
  const [instance, setInstance] = useState(null);

  const doc = useSelector(selectDocToView);
  // const { docRef } = doc;

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

        console.log({ files });

        // const URL = `https://${files[0].cid}.ipfs.w3s.link/`;
        // instance.Core.documentViewer.loadDocument(URL);

        const URL = `https://ipfs.io/ipfs/${files[0].cid}`;

        const response = await fetch(URL).then((r) => r.json());

        // const encryptionKey = key;

        // console.log({ encryptionKey, response });

        // // decrypt file data with encryptionKey (decryptedMessage)
        // const fileBlob = decryptDataArrayFromStringAES(
        //   response.fileStr,
        //   encryptionKey
        // );
        // const file = new File([fileBlob], "contract.pdf");

        // instance.Core.documentViewer.loadDocument(file, {
        //   filename: "contract.pdf",
        // });

        // const bytes = cryptoJs.AES.decrypt(response.xfdfStr, encryptionKey);
        // const xfdfContract = bytes.toString(cryptoJs.enc.Utf8);

        // console.log({
        //   xfdfContract,
        //   steps: contractQuery?.data?.contract?.steps,
        // });

        let fileContract = null;
        let xfdfContract = null;

        if (contractQuery.data?.contract?.encypted === 2) {
          const encryptedFileBlob = await base64StringToBlob(
            response.fileStr.encryptedFile
          );

          console.log({
            encryptedFileBlob,
            encryptedFile: response.fileStr.encryptedFile,
          });

          const decryptedFile = await decryptFile(
            encryptedFileBlob,
            response.fileStr.encryptedSymmetricKey,
            response.fileStr.accessControlConditions
          );
          const decryptedSignature = await decryptString(response.xfdfStr);

          console.log({ decryptedFile, decryptedSignature });

          fileContract = decryptedFile.result;
          xfdfContract = decryptedSignature.result;
        }

        if (
          contractQuery.data?.contract?.encypted === 0 ||
          contractQuery.data?.contract?.encypted === 1
        ) {
          const encryptionKey = key;

          const fileBlob = decryptDataArrayFromStringAES(
            response.fileStr,
            encryptionKey
          );

          fileContract = new File([fileBlob], "contract.pdf");

          const bytes = cryptoJs.AES.decrypt(response.xfdfStr, encryptionKey);
          xfdfContract = bytes.toString(cryptoJs.enc.Utf8);
        }

        instance.Core.documentViewer.loadDocument(fileContract, {
          filename: "contract.pdf",
        });

        console.log({ fileContract, xfdfContract });

        const xfdfOfSteps = await Promise.all(
          contractQuery?.data?.contract?.steps.edges.map(async (step) => {
            const files = await retrieveFiles(step.node?.contractHash);

            const URL = `https://ipfs.io/ipfs/${files[0].cid}`;

            const response = await fetch(URL).then((r) => r.json());

            const encryptionKey = key;

            const bytes = cryptoJs.AES.decrypt(response.xfdfStr, encryptionKey);
            const xfdfString = bytes.toString(cryptoJs.enc.Utf8);

            console.log({
              encryptionKey,
              stepFiles: files,
              response,
              xfdfString,
            });

            return xfdfString;
          })
        );

        console.log({ xfdfOfSteps });

        instance.Core.documentViewer.addEventListener(
          "annotationsLoaded",
          () => {
            xfdfOfSteps.forEach((xfdf) => {
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
              <Stack direction="column">
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
