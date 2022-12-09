import React, {useState} from 'react'
import {LaunchIcon} from '@sanity/icons'
import {DocumentActionProps} from 'sanity'

// import CrossDatasetDuplicator from '../components/CrossDatasetDuplicator'

export default function DuplicateToAction({draft, published, onComplete}: DocumentActionProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  return {
    disabled: draft,
    title: draft ? `Document must be Published to begin` : null,
    label: 'Duplicate to...',
    dialog: dialogOpen &&
      published && {
        type: 'modal',
        title: 'Cross Dataset Duplicator',
        // content: <CrossDatasetDuplicator docs={[published]} mode="action" config={config} />,
        content: <div>TODO</div>,
        onClose: () => onComplete(),
      },
    onHandle: () => setDialogOpen(true),
    icon: LaunchIcon,
  }
}
