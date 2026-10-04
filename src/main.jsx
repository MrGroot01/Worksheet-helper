import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import Sky from "./components/Sky.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Sky />
    <App />
  </StrictMode>
);