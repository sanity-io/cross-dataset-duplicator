import defaultResolve, {DuplicateAction} from 'part:@sanity/base/document-actions'
import config from 'config:@sanity/cross-dataset-duplicator'

import DuplicateToAction from './DuplicateToAction'

export default function resolveDocumentActions(props) { 
  const duplicatorTypes = config?.types ?? []
  const defaultActions = defaultResolve(props)

  // Insert 'Duplicate to...' after 'Duplicate' only on config'd types
  if (duplicatorTypes.includes(props?.type)) {
    return defaultActions.reduce((acc, cur) => {
      if (cur === DuplicateAction) {
        return [...acc, cur, DuplicateToAction]
      }

      return [...acc, cur]
    }, [])
  }

  return defaultActions
}
