import {PluginConfig} from '../types'

export const SECRET_NAMESPACE = `CrossDatasetDuplicator`

export const DEFAULT_CONFIG: Required<PluginConfig> = {
  apiVersion: '2025-02-19',
  tool: true,
  types: [],
  filter: '',
  follow: ['outbound'],
  queries: [],
}
