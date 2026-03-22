import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'

// --- Mock data ---

function makeMockService(i) {
  return {
    id: `svc-${i}`,
    name: `Service ${i}`,
    description: `Description for service ${i}`,
    url: `https://api${i}.example.com`,
    protocol: i % 3 === 0 ? 'L402' : i % 3 === 1 ? 'x402' : 'MPP',
    price_sats: 100 * i,
    price_usd: 0.05 * i,
    payment_asset: 'BTC',
    payment_network: 'lightning',
    category: i % 2 === 0 ? 'ai' : 'weather',
    provider: `Provider ${i}`,
    source: 'l402apps',
    featured: i === 1,
    health_status: 'healthy',
    uptime_30d: 99.0 + (i % 10) * 0.1,
    latency_p50_ms: 40 + i,
    last_checked: '2024-01-01T00:00:00Z',
    registered_at: '2023-06-01T00:00:00Z',
    http_method: 'GET',
    reliability_score: 0.9 + (i % 10) * 0.01,
  }
}

const MOCK_SERVICES = Array.from({ length: 20 }, (_, i) => makeMockService(i + 1))
const DEFAULT_FIELDS = ['name', 'url', 'protocol', 'price_sats', 'health_status']

const MOCK_CATEGORIES = {
  categories: {
    ai: { total: 311, protocols: { L402: 200, x402: 111 } },
    weather: { total: 50, protocols: { L402: 30, x402: 20 } },
    crypto: { total: 100, protocols: { L402: 80, x402: 20 } },
  },
}

const MOCK_HEALTH = {
  status: 'ok',
  total_endpoints: 15000,
  by_protocol: { L402: 8000, x402: 5000, MPP: 2000 },
  by_health: { healthy: 12000, degraded: 2000, down: 1000 },
}

// --- Setup: mock fetch, import server, connect in-memory client ---

let client
let lastFetchUrl
const originalFetch = globalThis.fetch

before(async () => {
  globalThis.fetch = async (url, _opts) => {
    lastFetchUrl = url.toString()
    const urlObj = new URL(lastFetchUrl)
    const path = urlObj.pathname

    if (path === '/api/v1/services') {
      const limit = parseInt(urlObj.searchParams.get('limit') || '50')
      const offset = parseInt(urlObj.searchParams.get('offset') || '0')
      const services = MOCK_SERVICES.slice(offset, offset + limit)
      return { ok: true, json: async () => ({ services, total: MOCK_SERVICES.length, limit, offset }) }
    }
    if (path.match(/^\/api\/v1\/services\/.+/)) {
      return { ok: true, json: async () => MOCK_SERVICES[0] }
    }
    if (path === '/api/v1/categories') {
      return { ok: true, json: async () => structuredClone(MOCK_CATEGORIES) }
    }
    if (path === '/api/v1/health') {
      return { ok: true, json: async () => structuredClone(MOCK_HEALTH) }
    }
    return { ok: false, status: 404, json: async () => ({ error: 'not found' }) }
  }

  const { server } = await import('../dist/index.js')
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await server.connect(serverTransport)
  client = new Client({ name: 'test', version: '1.0.0' })
  await client.connect(clientTransport)
})

after(() => {
  globalThis.fetch = originalFetch
})

async function callTool(name, args = {}) {
  const result = await client.callTool({ name, arguments: args })
  return result.content[0].text
}

// ============================================================
// 1. Remove pretty-printing
// ============================================================
describe('1. No pretty-printing', () => {
  it('search_services has no indented newlines', async () => {
    const text = await callTool('search_services')
    assert.ok(!text.includes('\n  '), 'Response should not contain pretty-print indentation')
  })

  it('get_service_detail has no indented newlines', async () => {
    const text = await callTool('get_service_detail', { id: 'svc-1' })
    assert.ok(!text.includes('\n  '))
  })

  it('list_categories has no indented newlines', async () => {
    const text = await callTool('list_categories')
    assert.ok(!text.includes('\n  '))
  })

  it('get_directory_stats has no indented newlines', async () => {
    const text = await callTool('get_directory_stats')
    assert.ok(!text.includes('\n  '))
  })
})

// ============================================================
// 2. Default limit 10
// ============================================================
describe('2. Default limit is 10', () => {
  it('default search returns at most 10 results', async () => {
    const text = await callTool('search_services')
    const data = JSON.parse(text)
    assert.ok(data.services.length <= 10, `Expected <=10, got ${data.services.length}`)
  })

  it('passes limit=10 to the API when no limit specified', async () => {
    await callTool('search_services')
    const url = new URL(lastFetchUrl)
    assert.equal(url.searchParams.get('limit'), '10')
  })

  it('respects explicit limit parameter', async () => {
    await callTool('search_services', { limit: 5 })
    const url = new URL(lastFetchUrl)
    assert.equal(url.searchParams.get('limit'), '5')
  })
})

// ============================================================
// 3. Fields parameter
// ============================================================
describe('3. Fields parameter', () => {
  it('default returns only 5 compact fields per service', async () => {
    const text = await callTool('search_services')
    const data = JSON.parse(text)
    assert.ok(data.services.length > 0, 'Should have services')
    for (const svc of data.services) {
      assert.deepEqual(Object.keys(svc).sort(), [...DEFAULT_FIELDS].sort())
    }
  })

  it('fields=all returns all fields', async () => {
    const text = await callTool('search_services', { fields: 'all' })
    const data = JSON.parse(text)
    for (const svc of data.services) {
      assert.ok(Object.keys(svc).length >= 20, `Expected all fields, got ${Object.keys(svc).length}`)
    }
  })

  it('fields=* returns all fields', async () => {
    const text = await callTool('search_services', { fields: '*' })
    const data = JSON.parse(text)
    for (const svc of data.services) {
      assert.ok(Object.keys(svc).length >= 20)
    }
  })

  it('fields=name,url returns exactly those 2', async () => {
    const text = await callTool('search_services', { fields: 'name,url' })
    const data = JSON.parse(text)
    for (const svc of data.services) {
      assert.deepEqual(Object.keys(svc).sort(), ['name', 'url'])
    }
  })
})

// ============================================================
// 4. CSV format
// ============================================================
describe('4. CSV format', () => {
  it('format=csv returns valid CSV with correct headers', async () => {
    const text = await callTool('search_services', { format: 'csv' })
    const lines = text.trim().split('\n')
    assert.ok(lines.length > 1, 'CSV should have header + data rows')
    const headers = lines[0].split(',')
    assert.deepEqual(headers.sort(), [...DEFAULT_FIELDS].sort())
  })

  it('format=csv data rows match service count', async () => {
    const text = await callTool('search_services', { format: 'csv', limit: 3 })
    const lines = text.trim().split('\n')
    assert.equal(lines.length, 4, 'Expected header + 3 data rows')
  })

  it('default format returns valid JSON', async () => {
    const text = await callTool('search_services')
    assert.doesNotThrow(() => JSON.parse(text), 'Default should be valid JSON')
  })
})

// ============================================================
// 5. Compact list_categories
// ============================================================
describe('5. Compact categories', () => {
  it('default returns flat array with name and count only', async () => {
    const text = await callTool('list_categories')
    const data = JSON.parse(text)
    assert.ok(Array.isArray(data.categories), 'categories should be an array')
    for (const cat of data.categories) {
      assert.deepEqual(Object.keys(cat).sort(), ['count', 'name'])
    }
  })

  it('summary=false returns full protocol breakdown', async () => {
    const text = await callTool('list_categories', { summary: false })
    const data = JSON.parse(text)
    assert.ok(!Array.isArray(data.categories), 'Full response should be an object')
    const firstKey = Object.keys(data.categories)[0]
    assert.ok(data.categories[firstKey].protocols, 'Should have protocols breakdown')
  })
})

// ============================================================
// 6. Tool descriptions have examples
// ============================================================
describe('6. Tool descriptions with examples', () => {
  it('all 4 tools have "Example:" in their description', async () => {
    const { tools } = await client.listTools()
    assert.equal(tools.length, 4, 'Should have exactly 4 tools')
    for (const tool of tools) {
      assert.ok(
        tool.description && tool.description.includes('Example:'),
        `Tool "${tool.name}" missing Example: in description`,
      )
    }
  })
})
