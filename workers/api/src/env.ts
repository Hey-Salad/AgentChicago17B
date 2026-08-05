export type AuthMode = 'access-code' | 'cf-access' | 'oauth' | 'anonymous'

export interface Env {
  DB: D1Database
  CACHE: KVNamespace
  BLOBS: R2Bucket
  VECTORS: VectorizeIndex
  AI: Ai
  ASSETS?: Fetcher
  AUTH_MODE: AuthMode | string
  WORKSPACE_ID: string
  WORKSPACE_NAME: string
  ACCESS_CODE?: string
  CF_ACCESS_TEAM_DOMAIN?: string
  CF_ACCESS_AUD?: string
  OAUTH_PROVIDER?: string
  OAUTH_CLIENT_ID?: string
  OAUTH_CLIENT_SECRET?: string
  OAUTH_REDIRECT_URL?: string
  CF_ACCOUNT_ID?: string
  CF_API_TOKEN?: string
  CF_AI_BASE_URL?: string
  OPENROUTER_API_KEY?: string
  NVIDIA_API_KEY?: string
  NVIDIA_BASE_URL?: string
  DEFAULT_MODEL?: string
}

export interface AuthContext {
  mode: AuthMode
  userId: string | null
  workspaceId: string
  deviceId?: string
  subject?: string
}
