import {PluginConfig} from '../types'

export const SECRET_NAMESPACE = `CrossDatasetDuplicator`

export const DEFAULT_CONFIG: PluginConfig = {
  tool: true,
  types: [],
  filter: '',
  follow: ['outbound'],
  migrationFilters: [],
}
