/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_URL: string;
  readonly VITE_FINGERPRINT_SERVICE_URL: string;
  readonly VITE_BRIDGE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
