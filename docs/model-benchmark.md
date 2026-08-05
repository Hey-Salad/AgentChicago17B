# Model benchmark — AgentChicago17B

Prompt: desk-research card JSON synthesis via NVIDIA Build (`integrate.api.nvidia.com`).

## Winner

**`meta/llama-3.1-8b-instruct`** — best for this agent right now.

- Valid research cards in ~2s
- Stable streaming
- Full finding / context / gap / recommendation structure

## Working models

| Model | Score | Time | Notes |
|-------|------:|-----:|-------|
| `meta/llama-3.1-8b-instruct` | 100 | 2.0s | **Recommended default** |
| `meta/llama-3.1-70b-instruct` | 73 | 144s | Good structure, too slow for interactive use |
| `meta/llama-3.3-70b-instruct` | 62 | 85s | Works, long cold start |

## Not usable in this pass

Timed out or 404 on chat completions (even if listed in `/v1/models`):

- `nvidia/llama-3.1-nemotron-nano-8b-v1`
- `nvidia/llama-3.1-nemotron-70b-instruct`
- `mistralai/mistral-7b-instruct-v0.3`
- `mistralai/mistral-nemotron`
- `google/gemma-3-12b-it`
- `ibm/granite-3.0-8b-instruct`
- `z-ai/glm-5.2` (timeout)

Raw results: [model-benchmark.json](./model-benchmark.json)
