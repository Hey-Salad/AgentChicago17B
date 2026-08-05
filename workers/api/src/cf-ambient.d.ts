/** Cloudflare Workers ambient types used by workers/api (no extra install required). */
interface D1Database {
  prepare(query: string): D1PreparedStatement
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = Record<string, unknown>>(): Promise<T | null>
  all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>
  run(): Promise<unknown>
}

interface KVNamespace {
  get(key: string, type?: 'text' | 'json'): Promise<unknown>
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number },
  ): Promise<void>
  delete(key: string): Promise<void>
}

interface R2Bucket {
  put(
    key: string,
    value: string | ArrayBuffer | ReadableStream,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>
  get(key: string): Promise<{ text(): Promise<string> } | null>
}

interface VectorizeVector {
  id: string
  values: number[]
  namespace?: string
  metadata?: Record<string, string>
}

interface VectorizeIndex {
  upsert(vectors: VectorizeVector[]): Promise<unknown>
  query(
    values: number[],
    options?: {
      topK?: number
      namespace?: string
      returnMetadata?: 'none' | 'indexed' | 'all'
    },
  ): Promise<{ matches?: Array<Record<string, unknown>> }>
}

interface Ai {
  run(model: string, inputs: Record<string, unknown>): Promise<unknown>
}

interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>
}
