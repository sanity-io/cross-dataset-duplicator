import {CrossDatasetDuplicatorActionProps} from '../types'

import CrossDatasetDuplicator from './CrossDatasetDuplicator'

/**
 * Component to perform a migration from the Cross Dataset Duplicator plugin
 * @public
 */
export function CrossDatasetDuplicatorAction(props: CrossDatasetDuplicatorActionProps) {
  const {docs = []} = props

  return <CrossDatasetDuplicator mode="action" docs={docs} />
}
