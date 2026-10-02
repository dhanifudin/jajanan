/**
 * Static → dynamic QRIS (EMVCo QR Code Specification) amount injection.
 *
 * A printed/merchant QRIS code (docs/qris.jpg) is STATIC: it carries no
 * amount, so the payer types it in by hand. This utility rewrites the raw
 * EMVCo payload to a DYNAMIC one carrying the exact order total, so the
 * payer's own e-wallet/banking app shows the amount pre-filled on scan —
 * no gateway, no API, no fee.
 *
 * EMVCo payload is a flat sequence of TLV (Tag-Length-Value) fields:
 *   tag (2 digits) + length (2 digits) + value (`length` chars)
 * repeated until the final tag 63 (CRC, always last, length 04).
 */

interface TlvField {
  tag: string
  value: string
}

const TAG_POI_METHOD = '01'
const POI_DYNAMIC = '12'
const TAG_AMOUNT = '54'
const TAG_COUNTRY_CODE = '58'
const TAG_MERCHANT_NAME = '59'
const TAG_CRC = '63'

function parseTlv(payload: string): TlvField[] {
  const fields: TlvField[] = []
  let p = 0
  while (p < payload.length) {
    const tag = payload.slice(p, p + 2)
    const length = parseInt(payload.slice(p + 2, p + 4), 10)
    if (!tag || Number.isNaN(length)) break
    const value = payload.slice(p + 4, p + 4 + length)
    fields.push({ tag, value })
    p += 4 + length
  }
  return fields
}

function buildTlv(fields: TlvField[]): string {
  return fields
    .map(({ tag, value }) => `${tag}${String(value.length).padStart(2, '0')}${value}`)
    .join('')
}

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) — the checksum EMVCo QR mandates. */
function crc16(data: string): string {
  let crc = 0xffff
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8
    for (let b = 0; b < 8; b++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1)
      crc &= 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

/**
 * Patch a static QRIS payload with a transaction amount, producing a
 * dynamic payload ready to render as a QR code.
 * @param staticPayload raw EMVCo string exported/scanned from the merchant QRIS
 * @param amount order total in whole Rupiah (no decimals)
 */
export function toDynamicQris(staticPayload: string, amount: number): string {
  const fields = parseTlv(staticPayload.trim())
  if (fields.length === 0) throw new Error('QRIS payload kosong atau tidak valid')

  const withoutCrcAndAmount = fields.filter(f => f.tag !== TAG_CRC && f.tag !== TAG_AMOUNT)

  const poiIndex = withoutCrcAndAmount.findIndex(f => f.tag === TAG_POI_METHOD)
  if (poiIndex === -1) throw new Error('Tag 01 (Point of Initiation Method) tidak ditemukan')
  withoutCrcAndAmount[poiIndex] = { tag: TAG_POI_METHOD, value: POI_DYNAMIC }

  const amountField: TlvField = { tag: TAG_AMOUNT, value: String(Math.round(amount)) }

  // Insert amount before country code (58), else before merchant name (59), else at end.
  let insertAt = withoutCrcAndAmount.findIndex(f => f.tag === TAG_COUNTRY_CODE)
  if (insertAt === -1) insertAt = withoutCrcAndAmount.findIndex(f => f.tag === TAG_MERCHANT_NAME)
  if (insertAt === -1) insertAt = withoutCrcAndAmount.length

  const patched = [
    ...withoutCrcAndAmount.slice(0, insertAt),
    amountField,
    ...withoutCrcAndAmount.slice(insertAt),
  ]

  const payloadWithoutCrc = buildTlv(patched) + `${TAG_CRC}04`
  const crc = crc16(payloadWithoutCrc)
  return payloadWithoutCrc + crc
}
