import {definePlugin} from 'sanity'

import {DuplicateToAction} from './actions/DuplicateToAction'
import {ConfigProvider} from './context/ConfigProvider'
import {DEFAULT_CONFIG} from './helpers/constants'
import {crossDatasetDuplicatorTool} from './tool'
import {PluginConfig} from './types'

/**
 * Plugin: Cross Dataset Duplicator
 * @public
 */
export const crossDatasetDuplicator = definePlugin<PluginConfig | void>((config = {}) => {
  const pluginConfig = {...DEFAULT_CONFIG, ...config}
  const {types} = pluginConfig

  return {
    name: '@sanity/cross-dataset-duplicator',
    tools: (prev) => (pluginConfig.tool ? [...prev, crossDatasetDuplicatorTool()] : prev),
    studio: {
      components: {
        layout: (props) => ConfigProvider({...props, pluginConfig}),
      },
    },
    document: {
      actions: (prev, {schemaType}) => {
        return types && types.includes(schemaType) ? [...prev, DuplicateToAction] : prev
      },
    },
  }
})
