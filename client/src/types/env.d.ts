/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEFAULT_WHATSAPP: string
  readonly VITE_DEFAULT_EMAIL: string
  readonly VITE_DEFAULT_PHONE: string
  readonly VITE_DEFAULT_ADDRESS: string
  readonly VITE_DEFAULT_CNPJ: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_API_TIMEOUT: string
  readonly VITE_MAX_FILE_SIZE: string
  readonly VITE_ALLOWED_FILE_TYPES: string
  readonly VITE_DEFAULT_PAGE_SIZE: string
  readonly VITE_MAX_PAGE_SIZE: string
  readonly VITE_DEFAULT_CACHE_TTL: string
  readonly VITE_MAX_CACHE_TTL: string
  readonly VITE_THEME: string
  readonly VITE_LANGUAGE: string
  readonly VITE_TIMEZONE: string
  readonly VITE_ANALYTICS_ENABLED: string
  readonly VITE_ANALYTICS_TRACKING_ID: string
  readonly VITE_MONITORING_ENABLED: string
  readonly VITE_MONITORING_ENDPOINT: string
  readonly VITE_FEATURE_DARK_MODE: string
  readonly VITE_FEATURE_ADVANCED_SEARCH: string
  readonly VITE_FEATURE_REALTIME_UPDATES: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
