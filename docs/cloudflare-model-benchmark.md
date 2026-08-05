# Cloudflare Workers AI benchmark — AgentChicago17B

Benchmarks run against Cloudflare **Workers AI** OpenAI-compatible endpoint
(`…/accounts/<ACCOUNT_ID>/ai/v1`) using local `.env` credentials (never committed).

## Winner for this agent

**`@cf/meta/llama-3.3-70b-instruct-fp8-fast`** — best balance of structure + speed (~2.8s, score 100).

Fast alternate: **`@cf/meta/llama-3.2-3b-instruct`** (~1.4s, score 100).

Default product pick in the UI: **`@cf/zai-org/glm-5.2`** (stronger reasoning, slower).

## Results (desk-research card JSON)

| Model | OK | Score | Time |
|-------|----|------:|-----:|
| `@cf/meta/llama-3.2-3b-instruct` | yes | 100 | 1.4s |
| `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | yes | 100 | 2.8s |
| `@cf/openai/gpt-oss-20b` | yes | 91 | 7.0s |
| `@cf/meta/llama-4-scout-17b-16e-instruct` | yes | 91 | 7.2s |
| `@cf/mistralai/mistral-small-3.1-24b-instruct` | yes | 82 | 10.3s |
| `@cf/zai-org/glm-5.2` | yes | 82 | 11.8s |
| `@cf/meta/llama-3.1-8b-instruct-fp8` | yes | 82 | 12.7s |
| `@cf/openai/gpt-oss-120b` | no | 0 | empty content |
| `@cf/zai-org/glm-4.7-flash` | no | 0 | parse fail |
| `@cf/qwen/qwen2.5-coder-32b-instruct` | no | 0 | bad response shape |

Raw: [cloudflare-model-benchmark.json](./cloudflare-model-benchmark.json)
