// Port of upstream goals_converter.py: turns the OoT bingo spreadsheet CSV into a v9-style goal list.

type Goal = Record<string, unknown> & { name?: string, id?: string, difficulty?: number }

type Column = { name: string, included: false } | { name: string, included: true, parse: (v: string) => unknown }

const SCHEMA: Column[] = [
  { name: 'updated', included: false },
  { name: 'name', included: true, parse: v => v },
  { name: 'jp', included: true, parse: v => v },
  { name: 'difficulty', included: true, parse: v => Number.parseInt(v, 10) },
  { name: 'time', included: true, parse: v => (v ? Number.parseFloat(v) : 0) },
  { name: 'skill', included: true, parse: v => (v ? Number.parseFloat(v) : 0) }
]

export const DEFAULT_DOWNLOAD_URL = 'https://docs.google.com/spreadsheet/ccc?key=1dRpwfIV2vDRL_Hq-pBj3U7wq7XwZ9JPW9Ac8hK5qbgc&output=csv'

export class ConversionError extends Error {}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          quoted = false
        }
      } else {
        field += ch
      }
    } else if (ch === '"') {
      quoted = true
    } else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += ch
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

function idFromName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

function parseSynergy(raw: string): number | 'yes' | 'no' {
  const value = raw.startsWith('*') ? raw.slice(1) : raw
  const num = Number.parseFloat(value)
  if (!Number.isNaN(num)) return num
  if (['true', 'yes'].includes(value.toLowerCase())) return 'yes'
  if (['false', 'no'].includes(value.toLowerCase())) return 'no'
  throw new ConversionError(`Failed to parse synergy value: ${JSON.stringify(raw)}`)
}

function rowToGoal(synergyHeader: string[], row: string[]): Goal {
  const goal: Goal = {}
  SCHEMA.forEach((col, i) => {
    if (col.included) goal[col.name] = col.parse(row[i] ?? '')
  })
  goal.id = goal.id ?? idFromName(String(goal.name ?? ''))

  const types: Record<string, unknown> = {}
  const subtypes: Record<string, unknown> = {}
  const rowtypes: Record<string, unknown> = {}
  synergyHeader.forEach((header, i) => {
    const raw = row[SCHEMA.length + i] ?? ''
    if (!raw) return
    const value = parseSynergy(raw)
    if (header.startsWith('*')) rowtypes[header.slice(1).split(':')[0]!] = value
    else if (raw.startsWith('*')) subtypes[header] = value
    else types[header] = value
  })
  goal.types = types
  if (Object.keys(subtypes).length) goal.subtypes = subtypes
  if (Object.keys(rowtypes).length) {
    goal.rowtypes = rowtypes
    if ('child' in rowtypes) goal.child = rowtypes.child
  }
  return goal
}

export function csvToGoalList(csv: string): string {
  const rows = parseCsv(csv)
  const width = Math.max(...rows.map(r => r.length))
  const columns = Array.from({ length: width }, (_, c) => rows.map(r => r[c] ?? ''))
  const kept = columns.filter(col => col.length && !col[0]!.startsWith('#'))
  const filtered = rows.map((_, r) => kept.map(col => col[r]!))
  const [header, synfilterRow, ...dataRows] = filtered
  if (!header || !synfilterRow) throw new ConversionError('Spreadsheet is empty')
  const synergyHeader = header.slice(SCHEMA.length)

  const output: Record<string, unknown> = { info: { version: 'v9 beta' } }
  for (let d = 0; d <= 50; d++) output[String(d)] = []
  const rowSynergies: Record<string, number> = {}
  for (const h of synergyHeader) {
    if (!h.startsWith('*')) continue
    const [name, value] = h.slice(1).split(':')
    rowSynergies[name!] = Number.parseFloat(value ?? '0')
  }
  output.rowtypes = rowSynergies
  const synfilters: Record<string, string> = {}
  synergyHeader.forEach((h, i) => {
    const filt = synfilterRow[SCHEMA.length + i]
    if (filt) synfilters[h] = filt
  })
  output.synfilters = synfilters

  for (const row of dataRows) {
    if (!row.some(Boolean)) break
    let goal: Goal
    try {
      goal = rowToGoal(synergyHeader, row)
    } catch (error) {
      throw new ConversionError(`Could not convert row ${JSON.stringify(row)}: ${(error as Error).message}`)
    }
    const bucket = output[String(goal.difficulty)] as Goal[] | undefined
    if (!bucket) throw new ConversionError(`Goal ${goal.name} has an unsupported difficulty ${goal.difficulty}`)
    bucket.push(goal)
  }
  return JSON.stringify(output, Object.keys(output).sort(), 4)
}

export async function downloadAndConvert(url: string): Promise<string> {
  const csv = await $fetch<string>(url, { responseType: 'text' }).catch((error) => {
    throw new ConversionError(`Unable to download spreadsheet: ${(error as Error).message}`)
  })
  return `var bingoList = ${csvToGoalList(csv)}`
}
