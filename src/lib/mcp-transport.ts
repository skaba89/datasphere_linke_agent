/**
 * Stateless MCP Streamable HTTP request validation.
 *
 * We advertise the November 2025 transport. JSON responses are supported;
 * streaming server notifications and HTTP sessions are intentionally absent.
 * A rejected request never reaches a tool handler.
 */
export const MCP_PROTOCOL_VERSION = '2025-11-25'
export const MCP_SUPPORTED_VERSIONS = ['2025-11-25', '2025-03-26'] as const

export function validateMcpTransport(request: Request, body: unknown): { status: number; message: string } | null {
  const origin = request.headers.get('origin')
  if (origin) {
    let requestOrigin: string
    try {
      requestOrigin = new URL(request.url).origin
      if (new URL(origin).origin !== origin || origin !== requestOrigin) {
        return { status: 403, message: 'Origin not permitted' }
      }
    } catch {
      return { status: 403, message: 'Origin not permitted' }
    }
  }

  const type = request.headers.get('content-type') || ''
  if (!type.toLowerCase().startsWith('application/json')) {
    return { status: 415, message: 'Content-Type application/json required' }
  }

  const accept = request.headers.get('accept') || ''
  if (accept && !(accept.includes('application/json') && accept.includes('text/event-stream'))) {
    return { status: 406, message: 'Accept must allow application/json and text/event-stream' }
  }

  const version = request.headers.get('mcp-protocol-version')
  if (version && !MCP_SUPPORTED_VERSIONS.includes(version as typeof MCP_SUPPORTED_VERSIONS[number])) {
    return { status: 400, message: 'Unsupported MCP-Protocol-Version' }
  }

  if (Array.isArray(body) || body === null || typeof body !== 'object') {
    return { status: 400, message: 'MCP expects one JSON-RPC object per request' }
  }

  const req = body as Record<string, unknown>
  if (req.jsonrpc !== '2.0' || typeof req.method !== 'string' || !req.method) {
    return { status: 400, message: 'Invalid JSON-RPC request' }
  }
  if (req.id !== undefined && req.id !== null && typeof req.id !== 'string' && typeof req.id !== 'number') {
    return { status: 400, message: 'Invalid JSON-RPC id' }
  }
  if (req.method === 'tools/call') {
    const params = req.params
    if (!params || typeof params !== 'object' || Array.isArray(params) ||
        typeof (params as Record<string, unknown>).name !== 'string') {
      return { status: 400, message: 'tools/call requires a tool name' }
    }
  }
  return null
}
