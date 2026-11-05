import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('Claude Code and ChatGPT LinkedIn agent configuration', () => {
  it.each([
    ['linkedin-editorial', '.claude/skills/linkedin-editorial/SKILL.md'],
    ['linkedin-audit', '.claude/skills/linkedin-audit/SKILL.md'],
  ])('includes valid frontmatter for %s', (name, path) => {
    const source = read(path)
    expect(source.startsWith('---\n')).toBe(true)
    expect(source).toContain('name: ' + name)
    expect(source).toMatch(/description: .+/)
  })

  it('requires approval before publication', () => {
    const editorial = read('.claude/skills/linkedin-editorial/SKILL.md')
    const chatgpt = read('docs/CHATGPT_LINKEDIN_INSTRUCTIONS.md')
    expect(editorial).toContain('approval_required: true')
    expect(editorial).toContain('pending')
    expect(chatgpt).toContain('confirmation explicite')
  })

  it('keeps the TikTok project separate', () => {
    const audit = read('docs/AI_AGENT_INTEGRATION.md')
    expect(audit).toContain('src/lib/mcp-tools.ts')
    expect(read('docs/CHATGPT_LINKEDIN_INSTRUCTIONS.md')).toContain('séparé de TikTok')
  })
})
