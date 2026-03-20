# 402 Index MCP Server

> Search 15,000+ paid API endpoints across L402, x402, and MPP protocols with real-time health monitoring.

The [402 Index](https://402index.io) is the world's largest directory of paid API endpoints for AI agents. This MCP server gives your agent access to search, filter, and evaluate paid APIs before spending money.

## Quick Start

```bash
npx @402index/mcp-server
```

## Installation

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "402index": {
      "command": "npx",
      "args": ["@402index/mcp-server"]
    }
  }
}
```

### Claude Code

```bash
claude mcp add 402index -- npx @402index/mcp-server
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "402index": {
      "command": "npx",
      "args": ["@402index/mcp-server"]
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `search_services` | Search 15,000+ paid APIs by keyword, protocol (L402/x402/MPP), category, health status, price, and more |
| `get_service_detail` | Full details for a service including health history, latency, pricing, and payment verification |
| `list_categories` | Browse all API categories with per-protocol endpoint counts |
| `get_directory_stats` | Directory-wide health stats, protocol breakdown, and sync timestamps |

## What Can Your Agent Discover?

- **L402 (Lightning)** — Self-custodial Bitcoin micropayments. 477 endpoints from providers like mutinynet faucet, sats4ai, LightningEnable.
- **x402 (Coinbase/Solana)** — USDC stablecoin payments on Base/Solana. 14,478 endpoints from Bazaar, Satring, Sponge.
- **MPP (Stripe/Tempo)** — Fiat-native machine payments. 488 endpoints from OpenAI, Anthropic, Google Gemini, Firecrawl, Replicate.

Every endpoint is health-checked hourly with latency measurements and reliability scoring.

## Example Prompts

- "Find healthy L402 APIs for weather data under $0.01"
- "What paid inference APIs are available and which have the best uptime?"
- "Show me all podcast-related paid APIs"
- "Which API categories have the most endpoints?"
- "Get details on the sats4ai image generation endpoint"

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `INDEX_URL` | `https://402index.io` | Base URL of the 402 Index API |

## Links

- **Website:** https://402index.io
- **API Docs:** https://402index.io/api-docs
- **OpenAPI Spec:** https://402index.io/api/v1/openapi.json
- **llms.txt:** https://402index.io/llms.txt
- **npm:** https://www.npmjs.com/package/@402index/mcp-server

## License

MIT
