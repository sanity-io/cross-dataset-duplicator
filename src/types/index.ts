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
}

export type CrossDatasetDuplicatorActionProps = {
  docs: SanityDocument[]
}
