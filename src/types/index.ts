import {SanityDocument} from 'sanity'

type MigrationFilter = {
  sourceDataset: string
  targets: {projectId?: string; dataset: string}[]
}

/**
 * Plugin configuration
 * @public
 */
export interface PluginConfig {
  tool?: boolean
  types?: string[]
  filter?: string
  follow?: ('inbound' | 'outbound')[]
  migrationFilters?: MigrationFilter[]
}

/**
 * Cross Dataset Duplicator document action props
 * @public
 */
export type CrossDatasetDuplicatorActionProps = {
  docs: SanityDocument[]
  onDuplicated?: () => Promise<void>
}
