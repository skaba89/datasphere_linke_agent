import { describe, it, expect } from 'vitest'
import { calculateProspectScore } from '@/lib/prospect-scoring'

// ============================================================
// Tests unitaires — Prospect Scoring Formula
//
// Valide la formule de scoring à 5 facteurs:
//   1. Stage (0-50 pts)
//   2. Reply rate (0-20 pts)
//   3. Tags (0-15 pts)
//   4. Recency (-15 to 0 pts)
//   5. Data completeness (0-15 pts)
// ============================================================

describe('lib/prospect-scoring.ts — calculateProspectScore', () => {
  it('new prospect with no data has low score (< 15)', () => {
    const r = calculateProspectScore({
      stage: 'new', tags: null, linkedinUrl: null, email: null,
      messagesCount: 0, repliesCount: 0, lastActivityAt: null,
    })
    expect(r.score).toBeLessThan(15)
    expect(r.breakdown.stage).toBe(2.5) // new = 5 * 0.5
  })

  it('won prospect with full data has high score (> 70)', () => {
    const r = calculateProspectScore({
      stage: 'won', tags: 'vip,hot', linkedinUrl: 'https://linkedin.com/in/test',
      email: 'test@example.com', messagesCount: 10, repliesCount: 5,
      lastActivityAt: new Date(),
    })
    expect(r.score).toBeGreaterThan(70)
  })

  it('lost prospect has score 0 or near 0', () => {
    const r = calculateProspectScore({
      stage: 'lost', tags: null, linkedinUrl: null, email: null,
      messagesCount: 0, repliesCount: 0, lastActivityAt: null,
    })
    expect(r.score).toBeLessThanOrEqual(10)
  })

  it('contacted prospect with email+linkedin has moderate score', () => {
    const r = calculateProspectScore({
      stage: 'contacted', tags: null, linkedinUrl: 'https://linkedin.com/in/test',
      email: 'test@example.com', messagesCount: 3, repliesCount: 0,
      lastActivityAt: new Date(),
    })
    expect(r.score).toBeGreaterThanOrEqual(25)
    expect(r.score).toBeLessThan(60)
  })

  it('score is always clamped 0-100', () => {
    const r = calculateProspectScore({
      stage: 'won', tags: 'vip,hot,priority,urgent', linkedinUrl: 'url', email: 'email',
      messagesCount: 100, repliesCount: 100, lastActivityAt: new Date(),
    })
    expect(r.score).toBeGreaterThanOrEqual(0)
    expect(r.score).toBeLessThanOrEqual(100)
  })

  it('priority tags (vip, hot, urgent) give 15 bonus', () => {
    const withPriority = calculateProspectScore({
      stage: 'new', tags: 'vip', linkedinUrl: null, email: null,
      messagesCount: 0, repliesCount: 0, lastActivityAt: null,
    })
    const withoutPriority = calculateProspectScore({
      stage: 'new', tags: 'regular-tag', linkedinUrl: null, email: null,
      messagesCount: 0, repliesCount: 0, lastActivityAt: null,
    })
    expect(withPriority.breakdown.tags).toBe(15)
    expect(withoutPriority.breakdown.tags).toBe(5) // any tag = 5
    expect(withPriority.score).toBeGreaterThan(withoutPriority.score)
  })

  it('no activity for 90+ days gives -15 recency malus', () => {
    const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000) // 100 days ago
    const r = calculateProspectScore({
      stage: 'new', tags: null, linkedinUrl: null, email: null,
      messagesCount: 1, repliesCount: 0, lastActivityAt: oldDate,
    })
    expect(r.breakdown.recency).toBe(-15)
  })

  it('recent activity gives 0 recency malus', () => {
    const r = calculateProspectScore({
      stage: 'new', tags: null, linkedinUrl: null, email: null,
      messagesCount: 1, repliesCount: 0, lastActivityAt: new Date(),
    })
    expect(r.breakdown.recency).toBe(0)
  })

  it('high reply rate gives more bonus than low reply rate', () => {
    const highReply = calculateProspectScore({
      stage: 'contacted', tags: null, linkedinUrl: null, email: null,
      messagesCount: 10, repliesCount: 8, lastActivityAt: new Date(),
    })
    const lowReply = calculateProspectScore({
      stage: 'contacted', tags: null, linkedinUrl: null, email: null,
      messagesCount: 10, repliesCount: 1, lastActivityAt: new Date(),
    })
    expect(highReply.breakdown.replyRate).toBeGreaterThan(lowReply.breakdown.replyRate)
    expect(highReply.score).toBeGreaterThan(lowReply.score)
  })

  it('linkedinUrl + email give 15 completeness bonus', () => {
    const r = calculateProspectScore({
      stage: 'new', tags: null, linkedinUrl: 'url', email: 'email',
      messagesCount: 0, repliesCount: 0, lastActivityAt: null,
    })
    expect(r.breakdown.completeness).toBe(15)
  })

  it('no linkedinUrl + no email give 0 completeness bonus', () => {
    const r = calculateProspectScore({
      stage: 'new', tags: null, linkedinUrl: null, email: null,
      messagesCount: 0, repliesCount: 0, lastActivityAt: null,
    })
    expect(r.breakdown.completeness).toBe(0)
  })

  it('breakdown has all 5 factors', () => {
    const r = calculateProspectScore({
      stage: 'new', tags: null, linkedinUrl: null, email: null,
      messagesCount: 0, repliesCount: 0, lastActivityAt: null,
    })
    expect(r.breakdown).toHaveProperty('stage')
    expect(r.breakdown).toHaveProperty('replyRate')
    expect(r.breakdown).toHaveProperty('tags')
    expect(r.breakdown).toHaveProperty('recency')
    expect(r.breakdown).toHaveProperty('completeness')
  })
})
