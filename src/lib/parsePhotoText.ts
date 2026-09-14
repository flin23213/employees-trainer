import { parseEmployeeMatrix, type ParseResult } from './parseEmployees.ts'

/** Printed rows: keep table spacing; split plain rows at a full name or initials. */
export function parsePhotoText(text: string): ParseResult {
  const matrix = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
    const clean = line.replace(/^\s*\d{1,4}[.)]?\s+/, '').replace(/^[|¦]\s*|\s*[|¦]$/g, '')
    const cells = clean.split(/\t+|\s*[|¦]\s*|\s{2,}|\s+[—–]\s+/).filter(Boolean)
    if (cells.length > 1) return cells
    // No invented title: ambiguous two-part names remain editable and blocked.
    const match = clean.match(/^([А-ЯЁA-Z][а-яёa-z'-]+\s+(?:[А-ЯЁA-Z][а-яёa-z'-]+\s+[А-ЯЁA-Z][а-яёa-z'-]+|[А-ЯЁA-Z]\.\s*[А-ЯЁA-Z]\.))\s+(.+)$/u)
    return match ? [match[1], match[2]] : [clean]
  })
  return parseEmployeeMatrix(matrix)
}
