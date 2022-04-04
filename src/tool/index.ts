import {LaunchIcon} from '@sanity/icons'
import config from 'config:@sanity/cross-dataset-duplicator'

import CrossDatasetDuplicator from '../components/CrossDatasetDuplicator'

export default config?.tool
  ? {
      title: 'Duplicator',
      name: 'duplicator',
      icon: LaunchIcon,
      component: CrossDatasetDuplicator,
    }
  : null
