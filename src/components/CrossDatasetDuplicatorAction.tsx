import React from 'react'
import {SanityDocument} from 'sanity'

import CrossDatasetDuplicator from './CrossDatasetDuplicator'

type CrossDatasetDuplicatorActionProps = {
  docs: SanityDocument[]
}

/**
 * Component to perform a migration from @sanity/cross-dataset-duplicator
 * @public
 */
export function CrossDatasetDuplicatorAction(props: CrossDatasetDuplicatorActionProps) {
  const {docs = []} = props

  return <CrossDatasetDuplicator mode="action" docs={docs} />
}
