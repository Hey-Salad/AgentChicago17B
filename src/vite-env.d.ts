/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LLM_API_KEY?: string
  readonly VITE_LLM_BASE_URL?: string
  readonly VITE_LLM_MODEL?: string
  readonly VITE_LLM_PROVIDER?: string
  readonly VITE_CF_API_KEY?: string
  readonly VITE_CF_BASE_URL?: string
  readonly VITE_OPENROUTER_API_KEY?: string
  readonly VITE_OPENROUTER_BASE_URL?: string
  readonly VITE_TAVILY_API_KEY?: string
  readonly VITE_APP_ACCESS_CODE?: string
  readonly VITE_AUTH_REQUIRED?: string
  readonly VITE_APP_URL?: string
  readonly VITE_APP_NAME?: string
  readonly VITE_CF_WHISPER_MODEL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
