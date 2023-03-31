import type {Tool} from 'sanity'
import {LaunchIcon} from '@sanity/icons'

import CrossDatasetDuplicator, {MultiToolConfig} from '../components/CrossDatasetDuplicator'

export const crossDatasetDuplicatorTool = (): Tool<MultiToolConfig> => ({
  title: 'Duplicator',
  name: 'duplicator',
  icon: LaunchIcon,
  component: CrossDatasetDuplicator,
  options: {
    mode: 'tool',
    docs: [],
  },
})
