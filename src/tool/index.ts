import type {Tool} from 'sanity'
import {LaunchIcon} from '@sanity/icons'

import CrossDatasetDuplicator, {MultiToolConfig} from '../components/CrossDatasetDuplicator'
import {PluginConfig} from '../types'

export const crossDatasetDuplicatorTool = (pluginConfig: PluginConfig): Tool<MultiToolConfig> => ({
  title: 'Duplicator',
  name: 'duplicator',
  icon: LaunchIcon,
  component: CrossDatasetDuplicator,
  options: {
    mode: 'tool',
    docs: [],
    pluginConfig,
  },
})
