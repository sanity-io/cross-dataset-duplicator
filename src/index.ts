import {definePlugin} from 'sanity'
import DuplicateToAction from './actions/DuplicateToAction'

export interface PluginConfig {
  tool?: boolean
  types?: string[]
  filter?: string
  follow?: ('inbound' | 'outbound')[]
}

const DEFAULT_CONFIG: PluginConfig = {
  tool: true,
  types: [],
  filter: '',
  follow: ['outbound'],
}

export const crossDatasetDuplicator = definePlugin<PluginConfig | void>((config = {}) => {
  const {types} = {...DEFAULT_CONFIG, ...config}

  return {
    name: '@sanity/cross-dataset-duplicator',
    document: {
      actions: (prev, {schemaType}) => {
        return types && types.includes(schemaType) ? [DuplicateToAction, ...prev] : prev
      },
    },
  }
})
