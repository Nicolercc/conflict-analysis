import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

// In dev: Vite proxy (/api → localhost:3001) handles routing
// In prod: Use VITE_API_BASE_URL environment variable (e.g., https://api.example.com)
const apiBase = import.meta.env.VITE_API_BASE_URL || "";
if (apiBase) {
  setBaseUrl(apiBase);
}

createRoot(document.getElementById("root")!).render(<App />);
