export type SanityDocument = {
  _id: string
  _type: string
}

export type PayloadItem = {
  include: boolean
  status: 'EXISTS' | 'OVERWRITE' | 'UPDATE' | 'CREATE'
  doc: SanityDocument
}
