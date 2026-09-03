import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";

// Base styles — order matters (tokens → theme → base → utilities).
import "bootstrap/dist/css/bootstrap-grid.min.css";
import "./styles/tokens.css";
import "./styles/theme.css";
import "./styles/base.css";
import "./styles/utilities.css";
import "./styles/responsive.css";
import "./styles/a11y.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);