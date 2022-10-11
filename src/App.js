import { useEffect, useState } from "react";
import { Router } from "@reach/router";
import { useSelector, useDispatch } from "react-redux";

import AssignUsers from "./components/AssignUsers";

import Preparation from "./components/Preparation";
import Sign from "./components/Sign";
import View from "./components/View";
import Header from "./components/Header";

import Welcome from "./components/Welcome";

import { setUser, selectUser } from "./firebase/firebaseSlice";

import "./App.css";

import SelectWallet from "./onboard/SelectWallet";
import { useConnectWallet } from "@web3-onboard/react";
import { useCeramic } from "./ceramic/context";
import { useCompose } from "./composedb/composedb";

import { useQuery, useMutation, gql } from "@apollo/client";

const NOTES_LIST_QUERY = gql`
  query NotesList($cursor: String) {
    viewer {
      noteList(last: 5, before: $cursor) {
        edges {
          node {
            id
            title
          }
        }
        pageInfo {
          hasPreviousPage
          startCursor
        }
      }
    }
  }
`;

const CREATE_NOTE_MUTATION = gql`
  mutation CreateNote($input: CreateNoteInput!) {
    createNote(input: $input) {
      document {
        id
      }
    }
  }
`;

const NOTE_QUERY = gql`
  query Note($id: ID!) {
    note: node(id: $id) {
      ... on Note {
        __typename
        id
        text
        title
        version
      }
    }
  }
`;

const UPDATE_NOTE_MUTATION = gql`
  mutation UpdateNote($input: UpdateNoteInput!) {
    updateNote(input: $input) {
      document {
        __typename
        id
        version
      }
    }
  }
`;

const App = () => {
  const [id, setId] = useState(null);
  const user = useSelector(selectUser);
  const compose = useCompose();

  const { loading, error, data } = useQuery(NOTES_LIST_QUERY, {
    skip: !user,
  });

  const [createNote] = useMutation(CREATE_NOTE_MUTATION, {
    refetchQueries: ["NotesList"],
  });

  const noteQuery = useQuery(NOTE_QUERY, { skip: !id, variables: { id } });
  const [updateNote, updateNoteState] = useMutation(UPDATE_NOTE_MUTATION);

  // console.log({ loading, error, data, noteQuery });

  const handleSave = () => {
    const text = "some text here";
    const title = "some title here";
    if (text && title) {
      createNote({ variables: { input: { content: { text, title } } } }).then(
        (res) => {
          const id = res.data?.createNote?.document?.id;
          console.log({ id });
        },
        (err) => {
          console.warn("Failed to create note", err);
        }
      );
    }
  };

  const handleGetNote = (id) => {
    setId(id);
  };

  // const dispatch = useDispatch();

  // const [{ wallet }] = useConnectWallet();
  // const address = wallet?.accounts?.[0];

  // useEffect(() => {
  //   if (address) {
  //     dispatch(
  //       setUser({
  //         uid: address,
  //         displayName: address,
  //         email: address,
  //         photoURL: "",
  //       })
  //     );
  //   } else {
  //     dispatch(setUser(null));
  //   }
  // }, [dispatch, address]);

  // const [doc, notesList] = await Promise.all([
  //   model.createTile('Note', { date: new Date().toISOString(), text }),
  //   store.get('notes'),
  // ])
  // const notes = notesList?.notes ?? []
  // await store.set('notes', {
  //   notes: [...notes, { id: doc.id.toUrl(), title }],
  // })
  // const docID = doc.id.toString()

  // const ceramic = useCeramic();

  // console.log("ceramic", ceramic);
  // console.log("compose", compose);

  // const createContract = async () => {
  //   const contract = await ceramic.createContract({
  //     name: "Test",
  //   });

  //   /** Check if post was shared with success or not */
  //   if (contract.status == 200) {
  //     console.log("Shared post with stream_id: ", contract.doc);
  //   } else {
  //     console.log("Error sharing post: ", contract);
  //   }
  // };

  // const getContracts = async () => {
  //   const contracts = await ceramic.getContracts();

  //   console.log("contracts", contracts);
  // };

  return (
    <div>
      {/* <div>
        <button onClick={() => createContract()}>createContract</button>
        <button onClick={() => getContracts()}>getContracts</button>
        <button onClick={() => handleSave()}>handleSave</button>
        <p>
          <input type="text" onChange={(e) => handleGetNote(e.target.value)} />
        </p>
      </div> */}
      {user ? (
        <div>
          <Header />
          <Router>
            <Welcome path="/" />
            <AssignUsers path="/assignUsers" />
            <Preparation path="/prepareDocument" />
            <Sign path="/signDocument" />
            <View path="/viewDocument" />
          </Router>
        </div>
      ) : (
        <div>
          <Header />
          <Router>
            <SelectWallet path="/" />
          </Router>
        </div>
      )}
    </div>
  );
};

export default App;
