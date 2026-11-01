// ============================================================
// Cursor-based Pagination Helper
//
// Utilise un curseur opaque (base64url de l'ID du dernier item)
// pour paginer de façon stable même si de nouveaux items sont
// insérés entre deux requêtes.
//
// Avantages vs offset-based :
//   - Pas de saut d'items si insert entre 2 pages
//   - Performance constante (index sur id + createdAt)
//   - Supporte le scroll infini
// ============================================================

export interface CursorPaginationParams {
  /** Number of items per page (default: 20, max: 100) */
  limit?: number
  /** Cursor from previous page (base64url-encoded id) */
  cursor?: string
}

export interface CursorPaginationResult<T> {
  data: T[]
  /** Cursor for next page (null if no more items) */
  nextCursor: string | null
  /** Whether there are more items */
  hasMore: boolean
}

const MAX_LIMIT = 100
const DEFAULT_LIMIT = 20

// ============================================================
// Encode an ID into a cursor (base64url)
// ============================================================
export function encodeCursor(id: string): string {
  return Buffer.from(`cursor:${id}`, 'utf-8').toString('base64url')
}

// ============================================================
// Decode a cursor back to an ID
// ============================================================
export function decodeCursor(cursor: string): string | null {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf-8')
    if (!decoded.startsWith('cursor:')) return null
    return decoded.slice('cursor:'.length)
  } catch {
    return null
  }
}

// ============================================================
// Normalize limit (clamp between 1 and MAX_LIMIT)
// ============================================================
export function normalizeLimit(limit?: number): number {
  if (!limit || typeof limit !== 'number' || limit < 1) return DEFAULT_LIMIT
  return Math.min(Math.floor(limit), MAX_LIMIT)
}

// ============================================================
// Build a cursor-based pagination result from items
//
// Usage:
//   const items = await db.post.findMany({
//     where: { ...cursorWhere(decodedCursor), ...filters },
//     orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
//     take: limit + 1, // fetch 1 extra to detect hasMore
//   })
//   return buildPaginationResult(items, limit)
// ============================================================
export function buildPaginationResult<T extends { id: string }>(
  items: T[],
  limit: number
): CursorPaginationResult<T> {
  const hasMore = items.length > limit
  const data = hasMore ? items.slice(0, limit) : items
  const nextCursor = hasMore && data.length > 0
    ? encodeCursor(data[data.length - 1].id)
    : null

  return {
    data,
    nextCursor,
    hasMore,
  }
}

// ============================================================
// Build a Prisma "where" clause for cursor-based pagination
//
// Assumes items are ordered by (createdAt DESC, id DESC).
// The cursor encodes the last item's id; we fetch items where
// (createdAt, id) < (cursorItem.createdAt, cursorItem.id).
//
// For simplicity (and because cuid IDs are sortable by time),
// we just use id < cursorId when using default cuid ordering.
// This works because cuid() generates IDs that are roughly
// time-ordered.
//
// For strict correctness with custom ordering, pass the
// cursorItem's createdAt and use a composite where clause.
// ============================================================
export function cursorWhere<T extends { id: string; createdAt?: Date }>(
  decodedCursorId: string | null,
  cursorItem?: T
): any {
  if (!decodedCursorId || !cursorItem) return {}
  // Use composite (createdAt, id) for stable ordering
  return {
    OR: [
      { createdAt: { lt: cursorItem.createdAt } },
      {
        createdAt: cursorItem.createdAt,
        id: { lt: decodedCursorId },
      },
    ],
  }
}
