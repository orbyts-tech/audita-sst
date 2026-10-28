import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AppProvider } from "@/app/AppProvider";
import { ErrorBoundary } from "@/components/security/ErrorBoundary";
import { EsocialProvider } from "@/features/esocial/EsocialProvider";
import App from "./App.tsx";
import "./styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AppProvider>
          <EsocialProvider>
            <App />
          </EsocialProvider>
        </AppProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
