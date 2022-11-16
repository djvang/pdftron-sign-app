import React, { useRef, useEffect, useState, useCallback } from "react";
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
import { selectDocToSign } from "./SignDocumentSlice";
import { storage, updateDocumentToSign } from "../../firebase/firebase";
import { selectUser } from "../../firebase/firebaseSlice";
import WebViewer from "@pdftron/webviewer";
import "gestalt/dist/gestalt.css";
import "./SignDocument.css";
import { useMutation, useQuery } from "@apollo/client";
import {
  CREATE_CONTRACT_STEP,
  QUERY_CONTRACT,
} from "../../composedb/composedb";
import {
  retrieve,
  retrieveFiles,
  storeFiles,
} from "../../web3.storage/put-files";
import { selectContractEncryption, selectKey } from "../Assign/AssignSlice";
import cryptoJs from "crypto-js";
import {
  decryptDataArrayFromStringAES,
  getEncryptedStringFromFile,
} from "../../crypto/cryptoJS";
import { decryptFile, decryptString, getAuthSig } from "../../lit/lit";
import { base64StringToBlob } from "lit-js-sdk";

const SignDocument = () => {
  const key = useSelector(selectKey);
  const contractEncryption = useSelector(selectContractEncryption);
  const [annotationManager, setAnnotationManager] = useState(null);
  const [annotPosition, setAnnotPosition] = useState(0);
  const [instance, setInstance] = useState(null);
  const doc = useSelector(selectDocToSign);
  const user = useSelector(selectUser);
  const [annotationsToDelete, setAnnotationsToDelete] = useState([]);
  console.log({ id: doc.id });
  const contractQuery = useQuery(QUERY_CONTRACT, {
    skip: !doc.id,
    variables: { id: doc.id },
  });
  const { docRef, docId } = doc;
  const { uid, email } = user;

  const viewer = useRef(null);

  const [createContractStep] = useMutation(CREATE_CONTRACT_STEP, {
    refetchQueries: ["Contracts"],
  });

  console.log({ doc, contractQuery });

  useEffect(() => {
    if (contractQuery.data) {
      WebViewer(
        {
          path: "webviewer",
          disabledElements: [
            "ribbons",
            "toggleNotesButton",
            "searchButton",
            "menuButton",
            "rubberStampToolGroupButton",
            "stampToolGroupButton",
            "fileAttachmentToolGroupButton",
            "calloutToolGroupButton",
            "undo",
            "redo",
            "eraserToolButton",
          ],
        },
        viewer.current
      ).then(async (instance) => {
        const { documentViewer, annotationManager, Annotations } =
          instance.Core;
        setAnnotationManager(annotationManager);
        setInstance(instance);
        // select only the insert group
        instance.UI.setToolbarGroup("toolbarGroup-Insert");

        // load document
        // const storageRef = storage.ref();
        // const URL = await storageRef.child(docRef).getDownloadURL();
        // documentViewer.loadDocument(URL);
        console.log({ contractQuery });
        const files = await retrieveFiles(
          contractQuery.data?.contract?.contractHash
        );

        console.log({ files });

        // const URL = `https://${files[0].cid}.ipfs.w3s.link/`;
        // documentViewer.loadDocument(URL);

        const URL = `https://ipfs.io/ipfs/${files[0].cid}`;

        const response = await fetch(URL).then((r) => r.json());

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

        documentViewer.loadDocument(fileContract, {
          filename: "contract.pdf",
        });

        console.log({ fileContract, xfdfContract });

        // decrypt signature data with encryptionKey (decryptedMessage)

        // xfdfData.forEach((xfdf) => {
        //   annotationManager.importAnnotations(xfdf);
        // });

        // annotationManager.importAnnotations(
        //   '<?xml version="1.0" encoding="UTF-8" ?><xfdf xmlns="http://ns.adobe.com/xfdf/" xml:space="preserve"><pdf-info xmlns="http://www.pdftron.com/pdfinfo" version="2" import-version="4"><ffield type="Sig" name="SignatureFormField 1" flags="Required" /><ffield type="Sig" name="0x4b0248658421c5BdBa044f12776D8611d2c651aF_SIGNATURE_16654044181281" /><ffield type="Sig" name="0xA7EC01b4AAB4Cc8c1c101a87C275C08e7C4F2675_SIGNATURE_16654044181312" /><widget field="SignatureFormField 1" name="a4af35b7-e00f-5fa9-9fd5-ff1779f6eb4a" modified-date="D:20220922160413-04\'00\'" page="1"><rect x1="183.12" x2="643.09" y1="756.58" y2="812.13" /><border /><trn-custom-data bytes="{&quot;trn-signature-type&quot;:&quot;fullSignature&quot;,&quot;trn-form-field-indicator-text&quot;:&quot;Sign Here&quot;,&quot;trn-form-field-show-indicator&quot;:&quot;true&quot;}" /></widget><widget appearance="_DEFAULT" field="0x4b0248658421c5BdBa044f12776D8611d2c651aF_SIGNATURE_16654044181281" name="84fd53a3-f0e1-5283-880c-ce30f4743458" modified-date="D:20221010132018+01\'00\'" page="1"><rect x1="255.3309" x2="548.9291" y1="558.5302" y2="617.2498" /><border width="0" style="null"><color a="0" /></border><appearances><aappearance name="_DEFAULT"><Normal>data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAYdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjEuMWMqnEsAAAANSURBVBhXY/j//z8DAAj8Av6IXwbgAAAAAElFTkSuQmCC</Normal></aappearance></appearances></widget><widget appearance="_DEFAULT" field="0xA7EC01b4AAB4Cc8c1c101a87C275C08e7C4F2675_SIGNATURE_16654044181312" name="1ce47027-5d85-340c-3025-3cff85626198" modified-date="D:20221010132018+01\'00\'" page="1"><rect x1="249.4509" x2="543.0491" y1="351.8402" y2="410.5598" /><border width="0" style="null"><color a="0" /></border><appearances><aappearance name="_DEFAULT"><Normal>data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAYdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjEuMWMqnEsAAAANSURBVBhXY/j//z8DAAj8Av6IXwbgAAAAAElFTkSuQmCC</Normal></aappearance></appearances></widget></pdf-info><fields><field name="SignatureFormField 1"><value></value></field><field name="0x4b0248658421c5BdBa044f12776D8611d2c651aF_SIGNATURE_16654044181281"><value></value></field><field name="0xA7EC01b4AAB4Cc8c1c101a87C275C08e7C4F2675_SIGNATURE_16654044181312"><value></value></field></fields><annots /><pages><defmtx matrix="1,0,0,-1,0,1056" /></pages></xfdf>'
        // );

        // annotationManager.importAnnotations(
        //   '<?xml version="1.0" encoding="UTF-8" ?><xfdf xmlns="http://ns.adobe.com/xfdf/" xml:space="preserve"><fields><field name="SignatureFormField 1"><value></value></field><field name="0x4b0248658421c5BdBa044f12776D8611d2c651aF_SIGNATURE_16654044181281"><value></value></field><field name="0xA7EC01b4AAB4Cc8c1c101a87C275C08e7C4F2675_SIGNATURE_16654044181312"><value></value></field></fields><annots><ink page="0" rect="255.331,558.530,317.409,617.250" color="#000000" flags="print" name="79b74489-1ce5-4cb4-b533-c0a8893a650d" title="Guest" subject="Signature" date="D:20221010184241+01\'00\'" creationdate="D:20221010184241+01\'00\'"><trn-custom-data bytes="{&quot;trn-annot-maintain-aspect-ratio&quot;:&quot;true&quot;}"/><inklist><gesture>255.65073229524572,616.9302677047542;255.65073229524572,616.9302677047542;255.65073229524572,616.9302677047542;258.15843657168284,615.6676473697651;280.7277750596169,597.9909626799147;293.26629644180247,587.89;310.82022637686225,572.7385559801282;314.5817827915179,568.9506949751603;317.0894870679551,565.1628339701923;317.0894870679551,563.900213635203</gesture><gesture>259.4122887099014,558.8497322952458;260.66614084811994,560.1123526302351;264.4276972627756,563.900213635203;279.4739229213983,581.5768983250534;286.99703575070964,592.9404813399573;295.77400071823956,605.5666846898505;297.02785285645814,608.091925359829;298.2817049946767,609.3545456948184;298.2817049946767,609.3545456948184</gesture></inklist></ink></annots><pages><defmtx matrix="1,0,0,-1,0,1056" /></pages></xfdf>'
        // );

        // documentViewer.refreshAll();
        // annotations.forEach((a) => {
        //   annotationManager.redrawAnnotation(a);
        // });

        const normalStyles = (widget) => {
          if (widget instanceof Annotations.TextWidgetAnnotation) {
            return {
              "background-color": "#a5c7ff",
              color: "white",
            };
          } else if (widget instanceof Annotations.SignatureWidgetAnnotation) {
            return {
              border: "1px solid #a5c7ff",
            };
          }
        };

        const xfdfOfSteps = await Promise.all(
          contractQuery?.data?.contract?.steps.edges.map(async (step) => {
            const files = await retrieveFiles(step.node?.contractHash);

            console.log({ stepFiles: files });

            const URL = `https://ipfs.io/ipfs/${files[0].cid}`;

            const response = await fetch(URL).then((r) => r.json());

            const encryptionKey = key;

            console.log({ encryptionKey, response });

            const bytes = cryptoJs.AES.decrypt(response.xfdfStr, encryptionKey);
            const xfdfString = bytes.toString(cryptoJs.enc.Utf8);

            return xfdfString;
          })
        );

        console.log({ xfdfOfSteps });

        // setAnnotationsToDelete([xfdfContract, ...xfdfOfSteps]);

        annotationManager.on(
          "annotationChanged",
          (annotations, action, { imported }) => {
            if (imported && action === "add") {
              annotations.forEach(function (annot) {
                const field = annot.fieldName.toLowerCase().split("_")[0];
                const isSigner = field === email.toLowerCase();
                console.log({
                  annot,
                  field,
                  signer: email.toLowerCase(),
                  isSigner: field === email.toLowerCase(),
                });
                if (annot instanceof Annotations.WidgetAnnotation) {
                  Annotations.WidgetAnnotation.getCustomStyles = normalStyles;

                  if (!isSigner) {
                    annot.Hidden = true;
                    annot.Listable = false;
                  } else {
                  }
                }
              });
            }
          }
        );

        documentViewer.addEventListener("annotationsLoaded", () => {
          [xfdfContract, ...xfdfOfSteps].forEach((xfdf) => {
            instance?.Core.annotationManager
              .importAnnotations(xfdf)
              .then((annotations) => {
                const mapppedAnnotations = annotations.map((a) => {
                  a.ReadOnly = true;
                  a.Hidden = false;
                  const field = a.fieldName.toLowerCase().split("_")[0];
                  const isSigner = field === email.toLowerCase();

                  if (!isSigner) {
                    a.Hidden = true;
                    a.Listable = false;
                  }

                  return a;
                });
                annotationManager.drawAnnotationsFromList(mapppedAnnotations);
                instance.Core.documentViewer.refreshAll();
              });
          });
        });

        documentViewer.addEventListener("documentLoaded", async () => {
          const doc = documentViewer.getDocument();
          await doc.documentCompletePromise();
          documentViewer.updateView();

          const keys = await doc.getTemplateKeys("schema");
          const values = {
            initiator: {
              field1: "value1",
              field2: "value2",
              cond_field1: true,
            },
            signer1: {
              field1: "signer value1",
            },
            signer2: {
              field1: "signer value1",
            },
          };
          await doc.applyTemplateValues(values);

          console.log({ doc, keys });
        });
      });
    }
    // return () => {
    //   instance.Core.documentViewer.removeEventListener("annotationsLoaded");
    //   instance.UI.closeDocument();
    // };
  }, [contractQuery.data, email]);

  const nextField = () => {
    let annots = annotationManager.getAnnotationsList();
    if (annots[annotPosition]) {
      annotationManager.jumpToAnnotation(annots[annotPosition]);
      if (annots[annotPosition + 1]) {
        setAnnotPosition(annotPosition + 1);
      }
    }
  };

  const prevField = () => {
    let annots = annotationManager.getAnnotationsList();
    if (annots[annotPosition]) {
      annotationManager.jumpToAnnotation(annots[annotPosition]);
      if (annots[annotPosition - 1]) {
        setAnnotPosition(annotPosition - 1);
      }
    }
  };

  const completeSigning = useCallback(async () => {
    const { docViewer } = instance;
    const docV = docViewer.getDocument();

    let encryptionKey = ""; // AES encryption key
    const passwordEncryption = contractEncryption === 1;

    if (passwordEncryption) {
      encryptionKey = key;
    }

    // delete old annotations
    // annotationManager.deleteAnnotations(annotationsToDelete, {
    //   force: true,
    // });

    const xfdfString = await annotationManager.exportAnnotations({
      widgets: false,
      links: false,
    });

    console.log({ xfdfNew: xfdfString, annotationsToDelete });

    // await updateDocumentToSign(docId, email, xfdf);
    // navigate("/");

    const data = await docV.getFileData({ xfdfString });

    const arr = new Uint8Array(data);

    const blob = new Blob([arr], { type: "application/pdf" });

    // const files = [new File([blob], `${uid}${Date.now()}.pdf`)];

    // encrypted file string
    const encryptedFile = await getEncryptedStringFromFile(blob, encryptionKey);
    // encrypted signature string
    const encryptedSignature = cryptoJs.AES.encrypt(
      xfdfString,
      encryptionKey
    ).toString();

    // payload to be uploaded on arweave via new storage service
    // breaking changes introduced for one-tap encryption
    // ver 4.1 indicates one-tap encryption breaking on payload
    const payload = {
      // recipientKeys: recipientKeys,
      fileStr: encryptedFile,
      xfdfStr: encryptedSignature,
      meta: {
        version: "1.0", // increase the version when breaking changes introduced
      },
    };

    console.log({ payload });

    // const arrJson = new Uint8Array(JSON.stringify(payload));
    const blobJson = new Blob([JSON.stringify(payload)], {
      type: "application/json",
    });
    // const files = [new File([blob], `${uid}${Date.now()}.pdf`)];
    console.log({ blobJson });
    const files = [new File([blobJson], `contract_name.json`)];

    console.log({ files });

    const cid = await storeFiles(files);
    const contractID = doc?.id;

    console.log({ cid, contractID });

    await createContractStep({
      variables: {
        input: {
          content: {
            contractID,
            contractHash: cid,
          },
        },
      },
    }).then(
      (res) => {
        console.log("created contract step");
        const id = res.data?.createContractStep?.document?.id;
        console.log({ id });

        navigate("/");
      },
      (err) => {
        console.warn("Failed to create contract", err);
      }
    );
  }, [contractQuery?.data, instance, annotationManager, uid]);

  return (
    <div className={"prepareDocument"}>
      <Box display="flex" direction="row" flex="grow">
        <Column span={2}>
          <Box padding={3}>
            <Heading size="md">Sign Document</Heading>
          </Box>
          <Box padding={3}>
            <Row gap={1}>
              <Stack direction="column">
                <Box padding={2}>
                  <Button
                    onClick={nextField}
                    accessibilityLabel="next field"
                    text="Next field"
                    iconEnd="arrow-forward"
                  />
                </Box>
                <Box padding={2}>
                  <Button
                    onClick={prevField}
                    accessibilityLabel="Previous field"
                    text="Previous field"
                    iconEnd="arrow-back"
                  />
                </Box>
                <Box padding={2}>
                  <Button
                    onClick={completeSigning}
                    accessibilityLabel="complete signing"
                    text="Complete signing"
                    iconEnd="compose"
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

export default SignDocument;
