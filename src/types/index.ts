import {SanityDocument} from 'sanity'

/**
 * Plugin configuration
 * @public
 */
export interface PluginConfig {
  tool?: boolean
  types?: string[]
  filter?: string
  follow?: ('inbound' | 'outbound')[]
  referenceMaxDepth?: number
  referenceMaxDepthAssetsOnly?: boolean
}

/**
 * Cross Dataset Duplicator document action props
 * @public
 */
export type CrossDatasetDuplicatorActionProps = {
  docs: SanityDocument[]
  onDuplicated?: () => Promise<void>
}
