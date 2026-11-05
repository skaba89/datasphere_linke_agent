import { describe, expect, it } from 'vitest'
import { MCP_PROTOCOL_VERSION, validateMcpTransport } from '@/lib/mcp-transport'

const endpoint = 'https://datasphere.example/api/mcp'
const request = (headers: Record<string, string> = {}) => new Request(endpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    ...headers,
  },
})

const rpc = { jsonrpc: '2.0', id: 1, method: 'tools/list' }

describe('MCP Streamable HTTP transport validation', () => {
  it('accepts a single JSON-RPC request', () => {
    expect(MCP_PROTOCOL_VERSION).toBe('2025-11-25')
    expect(validateMcpTransport(request(), rpc)).toBeNull()
  })

  it('rejects cross-origin requests', () => {
    expect(validateMcpTransport(request({ Origin: 'https://attacker.example' }), rpc)?.status).toBe(403)
    expect(validateMcpTransport(request({ Origin: 'https://datasphere.example' }), rpc)).toBeNull()
  })

  it('rejects batches and malformed JSON-RPC', () => {
    expect(validateMcpTransport(request(), [rpc])?.status).toBe(400)
    expect(validateMcpTransport(request(), { jsonrpc: '1.0', method: 'tools/list' })?.status).toBe(400)
    expect(validateMcpTransport(request(), { jsonrpc: '2.0', method: 'tools/call', params: {} })?.status).toBe(400)
  })

  it('rejects unsupported transport versions and content types', () => {
    expect(validateMcpTransport(request({ 'MCP-Protocol-Version': '2099-01-01' }), rpc)?.status).toBe(400)
    expect(validateMcpTransport(request({ 'Content-Type': 'text/plain' }), rpc)?.status).toBe(415)
    expect(validateMcpTransport(request({ Accept: 'text/plain' }), rpc)?.status).toBe(406)
  })

  it('accepts supported version headers', () => {
    expect(validateMcpTransport(request({ 'MCP-Protocol-Version': '2025-11-25' }), rpc)).toBeNull()
    expect(validateMcpTransport(request({ 'MCP-Protocol-Version': '2025-03-26' }), rpc)).toBeNull()
  })
})
