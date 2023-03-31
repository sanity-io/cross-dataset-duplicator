import type {Tool} from 'sanity'
import {LaunchIcon} from '@sanity/icons'

import {CrossDatasetDuplicatorTool, MultiToolConfig} from '../components/CrossDatasetDuplicatorTool'

export const crossDatasetDuplicatorTool = (): Tool<MultiToolConfig> => ({
  title: 'Duplicator',
  name: 'duplicator',
  icon: LaunchIcon,
  component: CrossDatasetDuplicatorTool,
  options: {
    docs: [],
  },
})
