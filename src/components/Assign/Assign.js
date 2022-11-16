import { useState, useRef, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { navigate } from "@reach/router";
import {
  Box,
  Button,
  Checkbox,
  Container,
  Heading,
  TextField,
  Table,
  Text,
  Toast,
  Flex,
  Spinner,
  SelectList,
} from "gestalt";
import "gestalt/dist/gestalt.css";
import {
  addSignee,
  selectAssignees,
  selectTemplate,
  setTemplate,
  selectContractEncryption,
  selectKey,
  setContractEncryption,
  setKey,
  selectInitiatorForm,
  setInitiatorForm,
} from "./AssignSlice";
import { useEffect } from "react";
import { useLit } from "../../lit/context";
import { useConnectWallet } from "@web3-onboard/react";
import { ethers } from "ethers";

import WebViewer from "@pdftron/webviewer";

function SelectTemplate() {
  const dispatch = useDispatch();
  const template = useSelector(selectTemplate);
  const TEMPLATES = ["without template", "template 1", "template 2"];

  const options = TEMPLATES.map((template, index) => ({
    label: template,
    value: index,
  }));

  const [errorMessage, setErrorMessage] = useState();

  const handleOnBlur = ({ value }) => {
    if (value !== "" && !TEMPLATES.includes(value))
      setErrorMessage("Please, select a valid option");
  };

  const resetInitiatorForm = () => dispatch(setInitiatorForm({}));

  const resetErrorMessage = errorMessage ? () => setErrorMessage() : () => {};

  return (
    <SelectList
      accessibilityClearButtonLabel="Clear the current value"
      errorMessage={errorMessage}
      id="header"
      label="Select template"
      noResultText="No results for your selection"
      onBlur={handleOnBlur}
      onChange={(e) => {
        resetErrorMessage();
        resetInitiatorForm();
        dispatch(setTemplate({ value: Number(e.value) }));
      }}
      onClear={resetErrorMessage}
      options={options}
      value={template}
      placeholder="Select template"
    />
  );
}

const Assign = () => {
  const [keys, setKeys] = useState(null);
  const [loading, setLoading] = useState(false);
  const [instance, setInstance] = useState(null);
  const viewer = useRef(null);
  const [{ wallet, connecting }, connect, disconnect] = useConnectWallet();
  const [litAuth, setLitAuth] = useState(false);
  const [email, setEmail] = useState("");
  const [litMessage, setLitMessage] = useState("");
  // const [password, setPassword] = useState("");
  // const [contractEncryption, setContractEncryption] = useState(1);
  const [displayName, setDisplayName] = useState("");
  const [showToast, setShowToast] = useState(false);
  const assignees = useSelector(selectAssignees);

  const contractEncryption = useSelector(selectContractEncryption);
  const key = useSelector(selectKey);
  const dispatch = useDispatch();

  const template = useSelector(selectTemplate);
  const initiatorForm = useSelector(selectInitiatorForm);

  let ethersProvider;
  if (wallet) {
    ethersProvider = new ethers.providers.Web3Provider(wallet.provider, "any");
  }

  const { getLit, getAuthSig, generateLitSignature, generateLitSignatureV2 } =
    useLit();

  useEffect(() => {
    console.log({ template });

    WebViewer(
      {
        path: "webviewer",
        preloadWorker: "office",
        fullAPI: false,
      },
      viewer.current
    ).then((instance) => {
      const { UI, Core } = instance;
      const { documentViewer } = instance.Core;

      UI.disableFeatures(UI.Feature.Annotations);

      setInstance(instance);

      documentViewer.addEventListener("documentLoaded", async () => {
        const doc = documentViewer.getDocument();
        await doc.documentCompletePromise();
        documentViewer.updateView();
        const keys = await doc.getTemplateKeys("schema");

        // await doc.applyTemplateValues(values);
        console.log({ doc, keys });

        setKeys(keys);
      });
    });
  }, []);

  const loadDoc = async () => {
    setKeys(null);
    setLoading(true);
    await instance.loadDocument(
      `${window.location.origin}/documents/template-${template}/template.docx`,
      {
        officeOptions: {
          doTemplatePrep: true,
        },
      }
    );
    setLoading(false);
  };

  useEffect(() => {
    if (instance && template > 0) {
      loadDoc();
    }
    if (template === 0) {
      setKeys(null);
    }
  }, [instance, template]);

  const prepare = () => {
    if (assignees.length > 0) {
      navigate(`/prepareDocument`);
    } else {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1000);
    }
  };

  const addUser = (name, email) => {
    const key = `${new Date().getTime()}${email}`;
    if (name !== "" && email !== "") {
      dispatch(addSignee({ key, name, email }));
      setEmail("");
      setDisplayName("");
    }
  };

  const handleContractEncryption = (event) => {
    dispatch(setContractEncryption({ value: Number(event.target.value) }));
  };

  const handleKey = (event) => {
    dispatch(setKey({ value: event.value }));
  };

  const handleInitiatorForm = (data = {}) => {
    console.log({ ...initiatorForm, ...data });
    dispatch(setInitiatorForm({ value: { ...initiatorForm, ...data } }));
  };

  useEffect(() => {
    setLitAuth(getAuthSig());
    dispatch(setKey({ value: "" }));
  }, []);

  useEffect(() => {
    setLitMessage("");
  }, [contractEncryption]);

  console.log({ wallet, loading, keys, initiatorForm });

  return (
    <div>
      <div className="webviewer" ref={viewer} style={{ height: "0vh" }}></div>
      <Box padding={3}>
        <Container>
          <Box padding={3}>
            <Heading size="md">Contract template</Heading>
          </Box>
          <Box padding={2}>
            <SelectTemplate />
          </Box>

          <Box padding={3}>
            {keys?.keys?.initiator && (
              <Box>
                <Box padding={2}>
                  <TextField
                    id="initiator-field1"
                    name="field1"
                    onChange={(event) =>
                      handleInitiatorForm({ field1: event.value })
                    }
                    placeholder="Field 1"
                    label="Field 1"
                    value={initiatorForm?.field1 ?? ""}
                    type="text"
                  />
                </Box>

                <Box padding={2}>
                  <TextField
                    id="initiator-field2"
                    name="field2"
                    onChange={(event) =>
                      handleInitiatorForm({ field2: event.value })
                    }
                    placeholder="Field 2"
                    label="Field 2"
                    value={initiatorForm?.field2 ?? ""}
                    type="text"
                  />
                </Box>

                <Box padding={2}>
                  <Checkbox
                    checked={initiatorForm?.cond_field1 ?? false}
                    id="checkbox"
                    label="cond_field1"
                    onChange={({ checked }) =>
                      handleInitiatorForm({ cond_field1: checked })
                    }
                  />
                </Box>

                <Box padding={2}>
                  <Checkbox
                    checked={initiatorForm?.cond_field2 ?? false}
                    id="checkbox"
                    label="cond_field2"
                    onChange={({ checked }) =>
                      handleInitiatorForm({ cond_field2: checked })
                    }
                  />
                </Box>
              </Box>
            )}
          </Box>

          <Box padding={3}>
            <Heading size="md">Who needs to sign?</Heading>
          </Box>
          <Box padding={2}>
            <TextField
              id="displayName"
              onChange={(event) => setDisplayName(event.value)}
              placeholder="Enter recipient's name"
              label="Name"
              value={displayName}
              type="text"
            />
          </Box>
          <Box padding={2}>
            <TextField
              id="email"
              onChange={(event) => setEmail(event.value)}
              placeholder="Enter recipient's address"
              label="Address"
              value={email}
              type="text"
            />
          </Box>
          <Box padding={2}>
            <Button
              onClick={(event) => {
                addUser(displayName, email);
              }}
              text="Add user"
              color="blue"
              inline
            />
          </Box>
          <Box padding={2}>
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>
                    <Text weight="bold">Name</Text>
                  </Table.HeaderCell>
                  <Table.HeaderCell>
                    <Text weight="bold">Address</Text>
                  </Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {assignees.map((user) => (
                  <Table.Row key={user.key}>
                    <Table.Cell>
                      <Text>{user.name}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text>{user.email}</Text>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </Box>

          <Box marginTop={10}>
            <Box marginBottom={2}>
              <Heading size="sm">Contract Encryption</Heading>
            </Box>
            <Box padding={2}>
              <label>
                <input
                  type="radio"
                  name="encryption"
                  value={0}
                  checked={0 === contractEncryption}
                  onChange={(event) => {
                    dispatch(setKey({ value: "" }));
                    handleContractEncryption(event);
                  }}
                />
                Without Encryption
              </label>
            </Box>
            <Box padding={2}>
              <label>
                <input
                  type="radio"
                  name="encryption"
                  value={1}
                  checked={1 === contractEncryption}
                  onChange={handleContractEncryption}
                />
                Password Protection
              </label>
              {contractEncryption === 1 && (
                <Box paddingY={2}>
                  <TextField
                    id="password"
                    onChange={handleKey}
                    placeholder="Enter password"
                    value={key}
                    type="password"
                  />
                </Box>
              )}
            </Box>
            <Box padding={2}>
              <Box marginBottom={2}>
                <label>
                  <input
                    type="radio"
                    name="encryption"
                    value={2}
                    checked={2 === contractEncryption}
                    onChange={(event) => {
                      dispatch(setKey({ value: "" }));
                      handleContractEncryption(event);
                    }}
                  />
                  Lit Protocol
                </label>
              </Box>
              {contractEncryption === 2 && !litAuth && (
                <Button
                  onClick={async () => {
                    if (wallet && ethersProvider) {
                      /** Generate the signature for Lit */
                      let resLitSig = await generateLitSignature(
                        wallet.provider,
                        wallet?.accounts?.[0]?.address
                      );
                      console.log({ resLitSig });

                      setLitMessage(resLitSig?.result);
                    }
                  }}
                  text="Lit sign in"
                  color="blue"
                  inline
                />
              )}
              {contractEncryption === 2 && litAuth && "Lit signed"}
              {litMessage}
            </Box>
          </Box>
          <Box marginTop={10} padding={2}>
            <Button onClick={prepare} text="Continue" color="blue" inline />
          </Box>
          <Box
            fit
            dangerouslySetInlineStyle={{
              __style: {
                bottom: 50,
                left: "50%",
                transform: "translateX(-50%)",
              },
            }}
            paddingX={1}
            position="fixed"
          >
            {showToast && (
              <Toast color="red" text={<>Please add at least one user</>} />
            )}
          </Box>
        </Container>
      </Box>
    </div>
  );
};

export default Assign;
