import { Analytics } from "@vercel/analytics/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/global.css";

const isLocalPreview = ["localhost", "127.0.0.1"].includes(window.location.hostname);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      {!isLocalPreview ? <Analytics /> : null}
    </BrowserRouter>
  </StrictMode>,
);
