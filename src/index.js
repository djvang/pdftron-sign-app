import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import store from "./app/store";
import { Provider } from "react-redux";
import { OnboardProvider } from "./onboard/context";
import { CeramicProvider } from "./ceramic/context";
// import { GlazedProvider } from "./glazed/context";
import { ComposeProvider } from "./composedb/composedb";
import { LitProvider } from "./lit/context";

ReactDOM.render(
  <React.StrictMode>
    <Provider store={store}>
      <OnboardProvider>
        <CeramicProvider>
          <ComposeProvider>
            <LitProvider>
              <App />
            </LitProvider>
          </ComposeProvider>
        </CeramicProvider>
      </OnboardProvider>
    </Provider>
  </React.StrictMode>,
  document.getElementById("root")
);
