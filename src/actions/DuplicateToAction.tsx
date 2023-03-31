import React, {useState} from 'react'
import {LaunchIcon} from '@sanity/icons'
import {DocumentActionProps} from 'sanity'

import CrossDatasetDuplicator from '../components/CrossDatasetDuplicator'

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
        content: (
          <CrossDatasetDuplicator
            // TODO: Re-using the tool component was not clever
            // Undo that decision
            // @ts-ignore
            tool={{
              options: {
                mode: 'action',
                docs: [published],
              },
            }}
          />
        ),
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
