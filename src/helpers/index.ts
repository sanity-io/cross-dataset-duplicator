import {CSSProperties} from 'react'

export function createInitialMessage(docCount = 0, refsCount = 0): string {
  const message = [
    docCount === 1 ? `This Document contains` : `These ${docCount} Documents contain`,
    refsCount === 1 ? `1 Reference.` : `${refsCount} References.`,
    refsCount === 1 ? `That Document` : `Those Documents`,
    `may have References too. If referenced Documents do not exist at the target Destination, this transaction will fail.`,
  ]

  return message.join(` `)
}

export const stickyStyles = {
  position: 'sticky',
  top: 0,
  zIndex: 100,
  backgroundColor: `rgba(255,255,255,0.95)`,
} as CSSProperties
