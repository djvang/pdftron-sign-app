import { createSlice } from "@reduxjs/toolkit";

export const AssignSlice = createSlice({
  name: "assign",
  initialState: {
    signees: [
      {
        key: 1,
        name: "user 1",
        email: "0xD22bF0d04B72Ee47FeC2a3CADF4dA483F04fCb95", // metamask
      },
      {
        key: 2,
        name: "user 2",
        email: "0xA7EC01b4AAB4Cc8c1c101a87C275C08e7C4F2675", // Binance
      },
    ],
    contractEncryption: 1,
    key: "123456",
  },
  reducers: {
    addSignee: (state, action) => {
      state.signees = [
        ...state.signees,
        {
          key: action.payload.key,
          name: action.payload.name,
          email: action.payload.email,
        },
      ];
    },
    resetSignee: (state, action) => {
      console.log("resetSignee");
      state.signees = [];
    },
    setContractEncryption: (state, action) => {
      state.contractEncryption = action.payload.value;
    },
    setKey: (state, action) => {
      state.key = action.payload.value;
    },
  },
});

export const { addSignee, resetSignee, setContractEncryption, setKey } =
  AssignSlice.actions;

export const selectAssignees = (state) => state.assign.signees;
export const selectContractEncryption = (state) =>
  state.assign.contractEncryption;
export const selectKey = (state) => state.assign.key;

export default AssignSlice.reducer;
