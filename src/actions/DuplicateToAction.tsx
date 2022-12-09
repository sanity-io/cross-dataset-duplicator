import React, {useState} from 'react'
import {LaunchIcon} from '@sanity/icons'
import {DocumentActionProps} from 'sanity'
import {PluginConfig} from '../types'

import CrossDatasetDuplicator from '../components/CrossDatasetDuplicator'

type DuplicateToActionProps = DocumentActionProps & {pluginConfig: PluginConfig}

export default function DuplicateToAction({
  draft,
  published,
  onComplete,
  pluginConfig,
}: DuplicateToActionProps) {
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
                pluginConfig,
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
