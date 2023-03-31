import React from 'react'
import {SanityDocument, Tool} from 'sanity'

import CrossDatasetDuplicator from './CrossDatasetDuplicator'

export type MultiToolConfig = {
  docs: SanityDocument[]
}

type CrossDatasetDuplicatorProps = {
  tool: Tool<MultiToolConfig>
}

export function CrossDatasetDuplicatorTool(props: CrossDatasetDuplicatorProps) {
  const {docs = []} = props.tool.options ?? {}

  return <CrossDatasetDuplicator mode="tool" docs={docs} />
}
