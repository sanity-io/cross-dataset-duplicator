import {definePlugin, DocumentActionProps} from 'sanity'

import DuplicateToAction from './actions/DuplicateToAction'
import {crossDatasetDuplicatorTool} from './tool'
import {PluginConfig} from './types'

export * from './types'

const DEFAULT_CONFIG: PluginConfig = {
  tool: true,
  types: [],
  filter: '',
  follow: ['outbound'],
}

/**
 * @sanity/cross-dataset-duplicator
 * @public
 */
export const crossDatasetDuplicator = definePlugin<PluginConfig | void>((config = {}) => {
  const pluginConfig = {...DEFAULT_CONFIG, ...config}
  const {types} = pluginConfig

  return {
    name: '@sanity/cross-dataset-duplicator',
    tools: (prev) =>
      pluginConfig.tool ? [...prev, crossDatasetDuplicatorTool(pluginConfig)] : prev,
    document: {
      actions: (prev, {schemaType}) => {
        return types && types.includes(schemaType)
          ? [...prev, (props: DocumentActionProps) => DuplicateToAction({...props, pluginConfig})]
          : prev
      },
    },
  }
})
