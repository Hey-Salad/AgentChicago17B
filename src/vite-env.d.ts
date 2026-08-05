/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LLM_API_KEY?: string
  readonly VITE_LLM_BASE_URL?: string
  readonly VITE_LLM_MODEL?: string
  readonly VITE_CF_API_KEY?: string
  readonly VITE_CF_BASE_URL?: string
  readonly VITE_TAVILY_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
