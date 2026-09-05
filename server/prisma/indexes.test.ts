import { describe, it, expect } from 'vitest'
import { prisma } from '../src/lib/prisma'

// Every FK column that's filtered on directly in a query path (see the service
// files under src/modules) needs an index — PostgreSQL doesn't create one
// automatically for a relation scalar the way MySQL does.
const expectedIndexedColumns: Record<string, string[]> = {
  ServiceType: ['userId'],
  Availability: ['userId'],
  RefreshToken: ['userId'],
  CustomFormField: ['serviceTypeId'],
  ServiceTypeAvailabilityRule: ['serviceTypeId'],
}

async function indexedColumns(table: string): Promise<Set<string>> {
  const rows = await prisma.$queryRaw<{ attname: string }[]>`
    SELECT a.attname
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = to_regclass(${`"${table}"`})
  `
  return new Set(rows.map((r) => r.attname))
}

describe('foreign key indexes', () => {
  for (const [table, columns] of Object.entries(expectedIndexedColumns)) {
    it(`indexes ${table}(${columns.join(', ')})`, async () => {
      const indexed = await indexedColumns(table)
      for (const column of columns) {
        expect(indexed.has(column)).toBe(true)
      }
    })
  }
})
