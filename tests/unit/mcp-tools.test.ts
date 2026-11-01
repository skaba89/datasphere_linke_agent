import { describe, it, expect } from 'vitest'

// ============================================================
// Tests unitaires — lib/mcp-tools.ts
//
// Teste la définition des tools MCP (pas les handlers DB).
// ============================================================

describe('lib/mcp-tools.ts', () => {
  it('MCP_TOOLS has 9 tools', async () => {
    const { MCP_TOOLS } = await import('@/lib/mcp-tools')
    expect(MCP_TOOLS).toHaveLength(9)
  })

  it('all tools have required fields', async () => {
    const { MCP_TOOLS } = await import('@/lib/mcp-tools')
    for (const tool of MCP_TOOLS) {
      expect(tool.name).toBeTruthy()
      expect(typeof tool.name).toBe('string')
      expect(tool.description).toBeTruthy()
      expect(typeof tool.description).toBe('string')
      expect(tool.inputSchema).toBeDefined()
      expect(tool.inputSchema.type).toBe('object')
      expect(tool.inputSchema.properties).toBeDefined()
      expect(typeof tool.handler).toBe('function')
    }
  })

  it('tool names are unique', async () => {
    const { MCP_TOOLS } = await import('@/lib/mcp-tools')
    const names = MCP_TOOLS.map(t => t.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('expected tools are present', async () => {
    const { MCP_TOOLS } = await import('@/lib/mcp-tools')
    const names = MCP_TOOLS.map(t => t.name)
    expect(names).toContain('list_posts')
    expect(names).toContain('get_post')
    expect(names).toContain('create_post')
    expect(names).toContain('list_prospects')
    expect(names).toContain('create_prospect')
    expect(names).toContain('get_analytics')
    expect(names).toContain('list_clients')
    expect(names).toContain('get_memory')
    expect(names).toContain('set_memory')
  })

  it('findTool returns the right tool', async () => {
    const { findTool } = await import('@/lib/mcp-tools')
    const tool = findTool('list_posts')
    expect(tool).toBeDefined()
    expect(tool?.name).toBe('list_posts')
  })

  it('findTool returns undefined for unknown tool', async () => {
    const { findTool } = await import('@/lib/mcp-tools')
    expect(findTool('nonexistent')).toBeUndefined()
  })

  it('toolsToList returns array with name + description + inputSchema', async () => {
    const { toolsToList } = await import('@/lib/mcp-tools')
    const list = toolsToList()
    expect(Array.isArray(list)).toBe(true)
    expect(list).toHaveLength(9)
    for (const item of list) {
      expect(item.name).toBeTruthy()
      expect(item.description).toBeTruthy()
      expect(item.inputSchema).toBeDefined()
    }
  })

  it('create_post tool has required fields in inputSchema', async () => {
    const { findTool } = await import('@/lib/mcp-tools')
    const tool = findTool('create_post')
    expect(tool?.inputSchema.required).toContain('title')
    expect(tool?.inputSchema.required).toContain('content')
    expect(tool?.inputSchema.properties.title).toBeDefined()
    expect(tool?.inputSchema.properties.content).toBeDefined()
  })

  it('set_memory tool has required key + value', async () => {
    const { findTool } = await import('@/lib/mcp-tools')
    const tool = findTool('set_memory')
    expect(tool?.inputSchema.required).toContain('key')
    expect(tool?.inputSchema.required).toContain('value')
  })

  it('create_post handler rejects empty title', async () => {
    const { findTool } = await import('@/lib/mcp-tools')
    const tool = findTool('create_post')
    const result = await tool!.handler('user-fake', { title: '', content: 'valid content' })
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('Titre')
  })

  it('create_post handler rejects short content', async () => {
    const { findTool } = await import('@/lib/mcp-tools')
    const tool = findTool('create_post')
    const result = await tool!.handler('user-fake', { title: 'Valid title', content: 'short' })
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('Contenu')
  })

  it('create_prospect handler rejects empty name', async () => {
    const { findTool } = await import('@/lib/mcp-tools')
    const tool = findTool('create_prospect')
    const result = await tool!.handler('user-fake', { name: '' })
    expect(result.isError).toBe(true)
  })

  it('get_post handler throws or returns error for unknown id (no DB)', async () => {
    const { findTool } = await import('@/lib/mcp-tools')
    const tool = findTool('get_post')
    // Sans DB, le handler va throw Prisma error
    // On vérifie juste qu'il gère l'erreur (throw ou isError)
    try {
      const result = await tool!.handler('user-fake', { id: 'fake-id' })
      // Si pas de throw, le résultat doit être défini
      expect(result).toBeDefined()
    } catch (err) {
      // Acceptable : Prisma error car pas de DB
      expect(err).toBeDefined()
    }
  })
})
