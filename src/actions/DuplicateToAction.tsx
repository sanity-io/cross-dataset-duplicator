import {useState} from 'react'
import {LaunchIcon} from '@sanity/icons'
import {DocumentActionProps} from 'sanity'

import {CrossDatasetDuplicatorAction} from '../components/CrossDatasetDuplicatorAction'

/**
 * Document action from the Cross Dataset Duplicator plugin
 * @public
 */
export const DuplicateToAction = (props: DocumentActionProps) => {
  const {draft, published, onComplete} = props
  const [dialogOpen, setDialogOpen] = useState(false)

  return {
    disabled: draft,
    title: draft ? `Document must be Published to begin` : null,
    label: 'Duplicate to...',
    dialog: dialogOpen &&
      published && {
        type: 'modal',
        title: 'Cross Dataset Duplicator',
        content: <CrossDatasetDuplicatorAction docs={[published]} />,
        onClose: () => {
          onComplete()
          setDialogOpen(false)
        },
      },
    onHandle: () => setDialogOpen(true),
    icon: LaunchIcon,
  }
}

DuplicateToAction.action = 'duplicateTo'
