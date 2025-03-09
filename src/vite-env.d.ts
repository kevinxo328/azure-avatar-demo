/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AOAI_API_ENDPOINT: string;
  readonly VITE_AOAI_API_KEY: string;
  readonly VITE_AOAI_API_VERSION: string;
  readonly VITE_AOAI_DEPLOYMENT_ID: string;
  readonly VITE_AOAI_WHISPER_API_ENDPOINT: string;
  readonly VITE_AOAI_WHISPER_API_KEY: string;
  readonly VITE_AOAI_WHISPER_API_VERSION: string;
  readonly VITE_AOAI_WHISPER_DEPLOYMENT_ID: string;
  readonly VITE_AZURE_AVATAR_API_ENDPOINT: string;
  readonly VITE_AZURE_AVATAR_API_KEY: string;
  readonly VITE_AZURE_AVATAR_REGION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
