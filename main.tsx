import React from "react";
import ReactDOM from "react-dom/client";
import TronApp from "./TronApp";
import "./showcase/styles.css";

if (new URLSearchParams(location.search).has("capture")) {
  // Offline capture has its own lifecycle: no playback clock or React effects.
  void import("./showcase/capture").then((module) =>
    module.initializeCapture(),
  );
} else {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <TronApp />
    </React.StrictMode>,
  );
}
