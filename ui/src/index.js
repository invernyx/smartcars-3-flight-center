import React from "react";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { BrowserRouter } from "react-router-dom";
import { createRoot } from "react-dom/client";

import "@tfdidesign/smartcars3-ui-sdk/css/smartcars.css";
import "./flight-center.css";

const container = document.getElementById("root");
const root = createRoot(container);

root.render(
    <React.StrictMode>
        <BrowserRouter basename="/plugins/com.tfdidesign.flight-center">
            <App />
        </BrowserRouter>
    </React.StrictMode>,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
