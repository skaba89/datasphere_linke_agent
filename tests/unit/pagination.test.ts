import { describe, it, expect } from 'vitest'
import {
  encodeCursor,
  decodeCursor,
  normalizeLimit,
  buildPaginationResult,
} from '@/lib/pagination'

// ============================================================
// Tests unitaires — lib/pagination.ts
// ============================================================

describe('lib/pagination.ts', () => {
  describe('encodeCursor / decodeCursor', () => {
    it('round-trips an ID correctly', () => {
      const id = 'cli_abc123xyz'
      const cursor = encodeCursor(id)
      expect(cursor).not.toBe(id) // encoded
      expect(decodeCursor(cursor)).toBe(id)
    })

    it('produces base64url-safe strings', () => {
      const cursor = encodeCursor('test+id/with=special')
      // base64url should not contain +, /, or =
      expect(cursor).not.toMatch(/[+/=]/)
    })

    it('returns null for invalid cursor', () => {
      expect(decodeCursor('not-a-valid-cursor')).toBeNull()
    })

    it('returns null for cursor without prefix', () => {
      // Encode something that doesn't have the 'cursor:' prefix
      const fake = Buffer.from('just-an-id', 'utf-8').toString('base64url')
      expect(decodeCursor(fake)).toBeNull()
    })

    it('returns null for empty string', () => {
      expect(decodeCursor('')).toBeNull()
    })
  })

  describe('normalizeLimit', () => {
    it('returns default 20 for undefined', () => {
      expect(normalizeLimit(undefined)).toBe(20)
    })

    it('returns default 20 for 0', () => {
      expect(normalizeLimit(0)).toBe(20)
    })

    it('returns default 20 for negative', () => {
      expect(normalizeLimit(-5)).toBe(20)
    })

    it('returns the limit for valid values', () => {
      expect(normalizeLimit(1)).toBe(1)
      expect(normalizeLimit(50)).toBe(50)
      expect(normalizeLimit(100)).toBe(100)
    })

    it('clamps to max 100', () => {
      expect(normalizeLimit(150)).toBe(100)
      expect(normalizeLimit(1000)).toBe(100)
    })

    it('floors fractional values', () => {
      expect(normalizeLimit(10.7)).toBe(10)
    })

    it('returns default for NaN', () => {
      expect(normalizeLimit(NaN)).toBe(20)
    })
  })

  describe('buildPaginationResult', () => {
    it('returns all items when fewer than limit', () => {
      const items = [
        { id: 'a', createdAt: new Date() },
        { id: 'b', createdAt: new Date() },
      ]
      const result = buildPaginationResult(items, 10)
      expect(result.data).toHaveLength(2)
      expect(result.hasMore).toBe(false)
      expect(result.nextCursor).toBeNull()
    })

    it('returns exactly limit items when exactly limit', () => {
      const items = Array.from({ length: 10 }, (_, i) => ({
        id: `item-${i}`,
        createdAt: new Date(),
      }))
      const result = buildPaginationResult(items, 10)
      expect(result.data).toHaveLength(10)
      expect(result.hasMore).toBe(false)
      expect(result.nextCursor).toBeNull()
    })

    it('returns limit items + hasMore + nextCursor when more than limit', () => {
      const items = Array.from({ length: 11 }, (_, i) => ({
        id: `item-${i}`,
        createdAt: new Date(),
      }))
      const result = buildPaginationResult(items, 10)
      expect(result.data).toHaveLength(10)
      expect(result.hasMore).toBe(true)
      expect(result.nextCursor).not.toBeNull()
      // nextCursor should encode the last item in the returned data
      expect(decodeCursor(result.nextCursor!)).toBe('item-9')
    })

    it('returns empty data + null cursor for empty input', () => {
      const result = buildPaginationResult([], 10)
      expect(result.data).toHaveLength(0)
      expect(result.hasMore).toBe(false)
      expect(result.nextCursor).toBeNull()
    })
  })
})
