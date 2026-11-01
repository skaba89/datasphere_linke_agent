import { NextResponse } from 'next/server'
import { verifyApiKey } from '@/lib/api-keys'
import { findTool, toolsToList } from '@/lib/mcp-tools'
import { logger } from '@/lib/logger'

// ============================================================
// /api/mcp — MCP (Model Context Protocol) Server Endpoint
//
// Implémente le protocole MCP via JSON-RPC 2.0 sur HTTP.
// Auth : Bearer <API_KEY> (dsk_live_XXX, plan Business+)
//
// Méthodes supportées :
//   - initialize       : handshake MCP
//   - tools/list       : liste les tools disponibles
//   - tools/call       : invoque un tool
//   - ping             : keepalive
//
// Le client (ex: Claude Desktop, Cursor) envoie une requête
// JSON-RPC en POST, le serveur répond avec un résultat.
// ============================================================

export const runtime = 'nodejs'
export const maxDuration = 30

const SERVER_INFO = {
  name: 'datasphere-mcp',
  version: '1.0.0',
}

const SERVER_CAPABILITIES = {
  tools: { listChanged: false },
  resources: { listChanged: false, subscribe: false },
  prompts: { listChanged: false },
  logging: {},
}

// ============================================================
// Main POST handler — JSON-RPC 2.0
// ============================================================
export async function POST(request: Request) {
  const startTime = Date.now()

  // ─── Auth ───
  const authHeader = request.headers.get('authorization')
  const authResult = await verifyApiKey(authHeader)
  if (!authResult) {
    return NextResponse.json(
      jsonRpcError(null, -32001, 'Non autorisé. Fournissez un header Authorization: Bearer <api_key>'),
      { status: 401 }
    )
  }
  const { userId } = authResult

  // ─── Parse JSON-RPC request ───
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(jsonRpcError(null, -32700, 'Parse error: JSON invalide'), { status: 400 })
  }

  // Handle batch requests
  if (Array.isArray(body)) {
    const results = await Promise.all(body.map(req => handleRequest(req, userId)))
    return NextResponse.json(results)
  }

  // Single request
  const result = await handleRequest(body, userId)

  // Notification (no id) → return 202 No Content
  if (result === null) {
    return new NextResponse(null, { status: 202 })
  }

  const durationMs = Date.now() - startTime
  logger.info({
    route: 'mcp',
    method: body?.method,
    userId,
    durationMs,
  }, 'MCP request handled')

  return NextResponse.json(result)
}

// ============================================================
// GET handler — server info / health check
// ============================================================
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const authResult = await verifyApiKey(authHeader)

  return NextResponse.json({
    server: SERVER_INFO,
    protocol: 'MCP/1.0 (JSON-RPC 2.0 over HTTP)',
    authenticated: !!authResult,
    toolsCount: 9,
    endpoints: {
      POST: '/api/mcp — JSON-RPC 2.0 request',
      GET: '/api/mcp — server info',
    },
    methods: ['initialize', 'tools/list', 'tools/call', 'ping'],
    auth: 'Bearer dsk_live_XXX (plan Business+ requis)',
  })
}

// ============================================================
// Handle a single JSON-RPC request
// ============================================================
async function handleRequest(req: any, userId: string): Promise<any | null> {
  const { jsonrpc, id, method, params } = req

  // Validate JSON-RPC version
  if (jsonrpc !== '2.0') {
    return jsonRpcError(id, -32600, 'Invalid Request: jsonrpc must be "2.0"')
  }

  try {
    switch (method) {
      // ─── Lifecycle ───
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: SERVER_CAPABILITIES,
            serverInfo: SERVER_INFO,
          },
        }

      case 'initialized':
        // Notification — no response
        return null

      case 'ping':
        return { jsonrpc: '2.0', id, result: {} }

      // ─── Tools ───
      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id,
          result: { tools: toolsToList() },
        }

      case 'tools/call': {
        const toolName = params?.name
        const toolArgs = params?.arguments || {}

        const tool = findTool(toolName)
        if (!tool) {
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32601, message: `Tool "${toolName}" introuvable` },
          }
        }

        try {
          const result = await tool.handler(userId, toolArgs)
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: result.content,
              isError: result.isError || false,
            },
          }
        } catch (toolErr: any) {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: `Erreur tool: ${toolErr.message}` }],
              isError: true,
            },
          }
        }
      }

      // ─── Resources (minimal stub) ───
      case 'resources/list':
        return { jsonrpc: '2.0', id, result: { resources: [] } }

      case 'prompts/list':
        return { jsonrpc: '2.0', id, result: { prompts: [] } }

      // ─── Unknown method ───
      default:
        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Méthode inconnue: ${method}` },
        }
    }
  } catch (err: any) {
    return jsonRpcError(req.id, -32603, `Erreur interne: ${err.message}`)
  }
}

// ============================================================
// Helper: JSON-RPC error response
// ============================================================
function jsonRpcError(id: any, code: number, message: string) {
  return {
    jsonrpc: '2.0',
    id,
    error: { code, message },
  }
}
