import defaultResolve, {PublishAction} from 'part:@sanity/base/document-actions'
import config from 'config:migration'

import MigrateAction from './MigrateAction'

export default function resolveDocumentActions(props) {
  const migrationTypes = config?.types ?? []
  const defaultActions = defaultResolve(props)

  // Insert 'Migrate' after 'Publish' only on config'd types
  if (migrationTypes.includes(props?.type)) {
    return defaultActions.reduce((acc, cur) => {
      if (cur === PublishAction) {
        return [cur, MigrateAction, ...acc]
      }

      return [...acc, cur]
    }, [])
  }

  return defaultActions
}
