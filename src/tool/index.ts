import {LaunchIcon} from '@sanity/icons'
import config from 'config:migration'

import Migration from '../components/Migration'

export default config?.tool
  ? {
      title: 'Migration',
      name: 'migration',
      icon: LaunchIcon,
      component: Migration,
    }
  : null
