import { useRef, useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { navigate } from "@reach/router";
import {
  Box,
  Column,
  Heading,
  Flex as Row,
  Flex as Stack,
  Text,
  Button,
  SelectList,
} from "gestalt";
import {
  selectAssignees,
  resetSignee,
  selectContractEncryption,
  selectKey,
  selectInitiatorForm,
  selectTemplate,
} from "../Assign/AssignSlice";
import { storage, addDocumentToSign } from "../../firebase/firebase";
import { selectUser } from "../../firebase/firebaseSlice";
import WebViewer from "@pdftron/webviewer";
import "gestalt/dist/gestalt.css";
import "./PrepareDocument.css";
import { storeFiles } from "../../web3.storage/put-files";
import { useMutation } from "@apollo/client";
import { CREATE_CONTRACT } from "../../composedb/composedb";
import { getEncryptedStringFromFile } from "../../crypto/cryptoJS";
import cryptoJs from "crypto-js";
import {
  encryptFile,
  encryptString,
  generateAccessControlConditions,
  getEncryptedStringFromFileLIT,
} from "../../lit/lit";

import LitJsSdk from "lit-js-sdk";

import { initializeHTMLViewer } from "@pdftron/webviewer-html";

const { blobToBase64String } = LitJsSdk;

const PrepareDocument = () => {
  const template = useSelector(selectTemplate);
  const initiatorForm = useSelector(selectInitiatorForm);
  const [instance, setInstance] = useState(null);
  const [dropPoint, setDropPoint] = useState(null);

  const [createContract] = useMutation(CREATE_CONTRACT, {
    refetchQueries: ["Contracts"],
  });

  const dispatch = useDispatch();

  const contractEncryption = useSelector(selectContractEncryption);
  const key = useSelector(selectKey);

  const assignees = useSelector(selectAssignees);
  const assigneesValues = assignees.map((user) => {
    return { value: user.email, label: user.name };
  });
  let initialAssignee =
    assigneesValues.length > 0 ? assigneesValues[0].value : "";
  const [assignee, setAssignee] = useState(initialAssignee);

  const user = useSelector(selectUser);
  const { uid, email } = user;

  const viewer = useRef(null);
  const filePicker = useRef(null);

  console.log({ contractEncryption, key, assignees, initiatorForm });
  // 0x5A633e60af7B6b1bB3D59f6b3a94adAae93551d7 metamsk
  // 0xD22bF0d04B72Ee47FeC2a3CADF4dA483F04fCb95 metamsk
  // 0xA7EC01b4AAB4Cc8c1c101a87C275C08e7C4F2675 BN

  // if using a class, equivalent of componentDidMount
  useEffect(() => {
    WebViewer(
      {
        path: "webviewer",
        preloadWorker: "office",
        // disabledElements: [
        //   "ribbons",
        //   "toggleNotesButton",
        //   "searchButton",
        //   "menuButton",
        // ],
        // initialDoc: "../../documents/template1/template.docx",
        fullAPI: false,
      },
      viewer.current
    ).then(async (instance) => {
      const { iframeWindow } = instance;
      const { documentViewer } = instance.Core;

      instance.UI.loadDocument(
        `${window.location.origin}/documents/template-${template}/template.docx`,
        {
          officeOptions: {
            doTemplatePrep: true,
          },
        }
      );

      // Extends WebViewer to allow loading HTML5 files from URL or static folder.
      // const { loadHTMLPage } = await initializeHTMLViewer(instance);

      // loadHTMLPage({
      //   iframeUrl: `${window.location.origin}/documents/template-${template}/template.html`,
      //   // URL that is being proxied
      //   urlToProxy: `${window.location.origin}/documents/template-${template}/template.html`,
      //   width: 1440,
      //   height: 770,
      // });

      // select only the view group
      instance.UI.setToolbarGroup("toolbarGroup-View");

      setInstance(instance);

      const iframeDoc = iframeWindow.document.body;
      iframeDoc.addEventListener("dragover", dragOver);
      iframeDoc.addEventListener("drop", (e) => {
        drop(e, instance);
      });

      filePicker.current.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          instance.UI.loadDocument(file);
        }
      };

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
        await doc.applyTemplateValues({ initiator: initiatorForm });

        console.log({ doc, keys });
      });
    });
  }, []);

  const applyFields = async () => {
    const { Annotations, documentViewer } = instance.Core;
    const annotationManager = documentViewer.getAnnotationManager();
    const fieldManager = annotationManager.getFieldManager();
    const annotationsList = annotationManager.getAnnotationsList();
    const annotsToDelete = [];
    const annotsToDraw = [];

    await Promise.all(
      annotationsList.map(async (annot, index) => {
        let inputAnnot;
        let field;

        if (typeof annot.custom !== "undefined") {
          // create a form field based on the type of annotation
          if (annot.custom.type === "TEXT") {
            field = new Annotations.Forms.Field(
              annot.getContents() + Date.now() + index,
              {
                type: "Tx",
                value: annot.custom.value,
              }
            );
            inputAnnot = new Annotations.TextWidgetAnnotation(field);
          } else if (annot.custom.type === "SIGNATURE") {
            field = new Annotations.Forms.Field(
              annot.getContents() + Date.now() + index,
              {
                type: "Sig",
              }
            );
            inputAnnot = new Annotations.SignatureWidgetAnnotation(field, {
              appearance: "_DEFAULT",
              appearances: {
                _DEFAULT: {
                  Normal: {
                    data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAYdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjEuMWMqnEsAAAANSURBVBhXY/j//z8DAAj8Av6IXwbgAAAAAElFTkSuQmCC",
                    offset: {
                      x: 100,
                      y: 100,
                    },
                  },
                },
              },
            });
          } else if (annot.custom.type === "DATE") {
            field = new Annotations.Forms.Field(
              annot.getContents() + Date.now() + index,
              {
                type: "Tx",
                value: "m-d-yyyy",
                // Actions need to be added for DatePickerWidgetAnnotation to recognize this field.
                actions: {
                  F: [
                    {
                      name: "JavaScript",
                      // You can customize the date format here between the two double-quotation marks
                      // or leave this blank to use the default format
                      javascript: 'AFDate_FormatEx("mmm d, yyyy");',
                    },
                  ],
                  K: [
                    {
                      name: "JavaScript",
                      // You can customize the date format here between the two double-quotation marks
                      // or leave this blank to use the default format
                      javascript: 'AFDate_FormatEx("mmm d, yyyy");',
                    },
                  ],
                },
              }
            );

            inputAnnot = new Annotations.DatePickerWidgetAnnotation(field);
          } else {
            // exit early for other annotations
            annotationManager.deleteAnnotation(annot, false, true); // prevent duplicates when importing xfdf
            return;
          }
        } else {
          // exit early for other annotations
          return;
        }

        // set position
        inputAnnot.PageNumber = annot.getPageNumber();
        inputAnnot.X = annot.getX();
        inputAnnot.Y = annot.getY();
        inputAnnot.rotation = annot.Rotation;
        if (annot.Rotation === 0 || annot.Rotation === 180) {
          inputAnnot.Width = annot.getWidth();
          inputAnnot.Height = annot.getHeight();
        } else {
          inputAnnot.Width = annot.getHeight();
          inputAnnot.Height = annot.getWidth();
        }

        // delete original annotation
        annotsToDelete.push(annot);

        // customize styles of the form field
        Annotations.WidgetAnnotation.getCustomStyles = function (widget) {
          if (widget instanceof Annotations.SignatureWidgetAnnotation) {
            return {
              border: "1px solid #a5c7ff",
            };
          }
        };
        Annotations.WidgetAnnotation.getCustomStyles(inputAnnot);

        // draw the annotation the viewer
        annotationManager.addAnnotation(inputAnnot);
        fieldManager.addField(field);
        annotsToDraw.push(inputAnnot);
      })
    );

    // delete old annotations
    annotationManager.deleteAnnotations(annotsToDelete, null, true);

    // refresh viewer
    await annotationManager.drawAnnotationsFromList(annotsToDraw);
    await uploadForSigning();
  };

  const addField = (type, point = {}, name = "", value = "", flag = {}) => {
    const { documentViewer, Annotations } = instance.Core;
    const annotationManager = documentViewer.getAnnotationManager();
    const doc = documentViewer.getDocument();
    const displayMode = documentViewer.getDisplayModeManager().getDisplayMode();
    const page = displayMode.getSelectedPages(point, point);
    if (!!point.x && page.first == null) {
      return; //don't add field to an invalid page location
    }
    const page_idx =
      page.first !== null ? page.first : documentViewer.getCurrentPage();
    const page_info = doc.getPageInfo(page_idx);
    const page_point = displayMode.windowToPage(point, page_idx);
    const zoom = documentViewer.getZoom();

    var textAnnot = new Annotations.FreeTextAnnotation();
    textAnnot.PageNumber = page_idx;
    const rotation = documentViewer.getCompleteRotation(page_idx) * 90;
    textAnnot.Rotation = rotation;
    if (rotation === 270 || rotation === 90) {
      textAnnot.Width = 50.0 / zoom;
      textAnnot.Height = 250.0 / zoom;
    } else {
      textAnnot.Width = 250.0 / zoom;
      textAnnot.Height = 50.0 / zoom;
    }
    textAnnot.X = (page_point.x || page_info.width / 2) - textAnnot.Width / 2;
    textAnnot.Y = (page_point.y || page_info.height / 2) - textAnnot.Height / 2;

    textAnnot.setPadding(new Annotations.Rect(0, 0, 0, 0));
    textAnnot.custom = {
      type,
      value,
      flag,
      name: `${assignee}_${type}_`,
    };

    // set the type of annot
    textAnnot.setContents(textAnnot.custom.name);
    textAnnot.FontSize = "" + 20.0 / zoom + "px";
    textAnnot.FillColor = new Annotations.Color(211, 211, 211, 0.5);
    textAnnot.TextColor = new Annotations.Color(0, 165, 228);
    textAnnot.StrokeThickness = 1;
    textAnnot.StrokeColor = new Annotations.Color(0, 165, 228);
    textAnnot.TextAlign = "center";

    textAnnot.Author = annotationManager.getCurrentUser();

    annotationManager.deselectAllAnnotations();
    annotationManager.addAnnotation(textAnnot, true);
    annotationManager.redrawAnnotation(textAnnot);
    annotationManager.selectAnnotation(textAnnot);
  };

  const uploadForSigning = async () => {
    let encryptionKey = ""; // AES encryption key
    const passwordEncryption = contractEncryption === 1;

    if (passwordEncryption) {
      encryptionKey = key;
    }

    // upload the PDF with fields as AcroForm
    // const storageRef = storage.ref();
    // const referenceString = `docToSign/${uid}${Date.now()}.pdf`;
    // const docRef = storageRef.child(referenceString);
    const { docViewer, annotManager } = instance;
    const doc = docViewer.getDocument();
    const xfdfString = await annotManager.exportAnnotations({
      widgets: true,
      fields: true,
    });

    // options to get file data from pdfviewer
    const options = {
      flatten: false,
      finishedWithDocument: false,
      printDocument: false,
      downloadType: "pdf",
      includeAnnotations: false,
    };

    const data = await doc.getFileData(options);
    const arr = new Uint8Array(data);
    // const blob = new Blob([arr], { type: "application/pdf" });
    // docRef.put(blob).then(function (snapshot) {
    //   console.log("Uploaded the blob");
    // });

    const blob = new Blob([arr], { type: "application/pdf" });
    let payload = null;

    if (contractEncryption === 2) {
      const recipients = assignees.map((assignee) => {
        return assignee.email;
      });

      const { accessControlConditions } =
        generateAccessControlConditions(recipients);

      console.log({ recipients, accessControlConditions });

      const encryptedFile = await encryptFile(blob, accessControlConditions);
      const encryptedSignature = await encryptString(
        xfdfString,
        accessControlConditions
      );

      encryptedFile.encryptedFile = await blobToBase64String(
        encryptedFile.encryptedFile
      );

      payload = {
        // recipientKeys: recipientKeys,
        fileStr: encryptedFile,
        xfdfStr: encryptedSignature,
        meta: {
          version: "1.0", // increase the version when breaking changes introduced
        },
      };
    }

    if (contractEncryption === 0 || contractEncryption === 1) {
      // encrypted file string
      const encryptedFile = await getEncryptedStringFromFile(
        blob,
        encryptionKey
      );
      // encrypted signature string
      const encryptedSignature = cryptoJs.AES.encrypt(
        xfdfString,
        encryptionKey
      ).toString();

      // payload to be uploaded on arweave via new storage service
      // breaking changes introduced for one-tap encryption
      // ver 4.1 indicates one-tap encryption breaking on payload
      payload = {
        // recipientKeys: recipientKeys,
        fileStr: encryptedFile,
        xfdfStr: encryptedSignature,
        meta: {
          version: "1.0", // increase the version when breaking changes introduced
        },
      };
    }

    console.log({ encryption: contractEncryption, payload });

    // "Expecting Array type for parameter named accessControlConditions in Lit-JS-SDK function saveEncryptionKey(), but received "Object" type instead. value: {"accessControlConditions":[{"contractAddress":"","standardContractType":"","chain":"ethereum","method":"","parameters":[":userAddress"],"returnValueTest":{"comparator":"=","value":"0xD22bF0d04B72Ee47FeC2a3CADF4dA483F04fCb95"}},{"operator":"or"},{"contractAddress":"","standardContractType":"","chain":"ethereum","method":"","parameters":[":userAddress"],"returnValueTest":{"comparator":"=","value":"0xA7EC01b4AAB4Cc8c1c101a87C275C08e7C4F2675"}}],"solRpcConditions":[]}"

    // const arrJson = new Uint8Array(JSON.stringify(payload));
    const blobJson = new Blob([JSON.stringify(payload)], {
      type: "application/json",
    });
    // const files = [new File([blob], `${uid}${Date.now()}.pdf`)];
    console.log({ blobJson });
    const files = [
      new File([JSON.stringify(payload)], `contract_name.json`, {
        type: "application/json",
      }),
    ];

    console.log({ files });

    const cid = await storeFiles(files);

    const signers = assignees.map((assignee) => {
      return { address: assignee.email };
    });

    console.log({ signers });

    await createContract({
      variables: {
        input: {
          content: {
            name: `Name contract ${Date.now()}`,
            contractHash: cid,
            encypted: Number(contractEncryption),
            signers,
          },
        },
      },
    }).then(
      (res) => {
        console.log("created contract");
        const id = res.data?.createContract?.document?.id;
        console.log({ id });

        dispatch(resetSignee());
        navigate("/");
      },
      (err) => {
        console.warn("Failed to create contract", err);
      }
    );

    // create an entry in the database
    // const emails = assignees.map((assignee) => {
    //   return assignee.email;
    // });
    // await addDocumentToSign(uid, email, referenceString, emails);
    // dispatch(resetSignee());
    // navigate("/");
  };

  const dragOver = (e) => {
    e.preventDefault();
    return false;
  };

  const drop = (e, instance) => {
    const { docViewer } = instance;
    const scrollElement = docViewer.getScrollViewElement();
    const scrollLeft = scrollElement.scrollLeft || 0;
    const scrollTop = scrollElement.scrollTop || 0;
    setDropPoint({ x: e.pageX + scrollLeft, y: e.pageY + scrollTop });
    e.preventDefault();
    return false;
  };

  const dragStart = (e) => {
    e.target.style.opacity = 0.5;
    const copy = e.target.cloneNode(true);
    copy.id = "form-build-drag-image-copy";
    copy.style.width = "250px";
    document.body.appendChild(copy);
    e.dataTransfer.setDragImage(copy, 125, 25);
    e.dataTransfer.setData("text", "");
  };

  const dragEnd = (e, type) => {
    addField(type, dropPoint);
    e.target.style.opacity = 1;
    document.body.removeChild(
      document.getElementById("form-build-drag-image-copy")
    );
    e.preventDefault();
  };

  return (
    <div className={"prepareDocument"}>
      <Box display="flex" direction="row" flex="grow">
        <Column span={2}>
          <Box padding={3}>
            <Heading size="md">Prepare Document</Heading>
          </Box>
          <Box padding={3}>
            <Row gap={1}>
              <Stack direction="column">
                <Box padding={2}>
                  <Text>{"Step 1"}</Text>
                </Box>
                <Box padding={2}>
                  <Button
                    onClick={() => {
                      if (filePicker) {
                        filePicker.current.click();
                      }
                    }}
                    accessibilityLabel="upload a document"
                    text="Upload a document"
                    iconEnd="add-circle"
                  />
                </Box>
              </Stack>
            </Row>
            <Row>
              <Stack direction="column">
                <Box padding={2}>
                  <Text>{"Step 2"}</Text>
                </Box>
                <Box padding={2}>
                  <SelectList
                    id="assigningFor"
                    name="assign"
                    onChange={({ value }) => setAssignee(value)}
                    options={assigneesValues}
                    placeholder="Select recipient"
                    label="Adding signature for"
                    value={assignee}
                  />
                </Box>
                <Box padding={2}>
                  <div
                    draggable
                    onDragStart={(e) => dragStart(e)}
                    onDragEnd={(e) => dragEnd(e, "SIGNATURE")}
                  >
                    <Button
                      onClick={() => addField("SIGNATURE")}
                      accessibilityLabel="add signature"
                      text="Add signature"
                      iconEnd="compose"
                    />
                  </div>
                </Box>
                <Box padding={2}>
                  <div
                    draggable
                    onDragStart={(e) => dragStart(e)}
                    onDragEnd={(e) => dragEnd(e, "TEXT")}
                  >
                    <Button
                      onClick={() => addField("TEXT")}
                      accessibilityLabel="add text"
                      text="Add text"
                      iconEnd="text-sentence-case"
                    />
                  </div>
                </Box>
                <Box padding={2}>
                  <div
                    draggable
                    onDragStart={(e) => dragStart(e)}
                    onDragEnd={(e) => dragEnd(e, "DATE")}
                  >
                    <Button
                      onClick={() => addField("DATE")}
                      accessibilityLabel="add date field"
                      text="Add date"
                      iconEnd="calendar"
                    />
                  </div>
                </Box>
              </Stack>
            </Row>
            <Row gap={1}>
              <Stack direction="column">
                <Box padding={2}>
                  <Text>{"Step 3"}</Text>
                </Box>
                <Box padding={2}>
                  <Button
                    onClick={applyFields}
                    accessibilityLabel="Send for signing"
                    text="Send"
                    iconEnd="send"
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
      <input type="file" ref={filePicker} style={{ display: "none" }} />
    </div>
  );
};

export default PrepareDocument;
