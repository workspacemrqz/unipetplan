/// <reference types="vite/client" />

declare module '@shared/schema' {
  const schema: any;
  export = schema;
}

interface ImportMetaEnv {
  readonly VITE_APP_TITLE?: string;
  readonly VITE_APP_DESCRIPTION?: string;
  // Add more environment variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}