import {SanityDocument} from 'sanity'

/**
 * Reference object
 * @public
 */
export type reference = {
  maxDepth: number // Number of documents deep to follow
  assetsOnly?: boolean // If true, only gather image and file assests
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
  reference?: reference
}

/**
 * Cross Dataset Duplicator document action props
 * @public
 */
export type CrossDatasetDuplicatorActionProps = {
  docs: SanityDocument[]
  onDuplicated?: () => Promise<void>
}
