/* eslint-disable react/jsx-no-bind */
import React, {useState} from 'react'
import {LaunchIcon} from '@sanity/icons'

import Migration from '../components/Migration'

export default function MigrateAction({draft, published, onComplete}) {
  const [dialogOpen, setDialogOpen] = useState(false)

  return {
    disabled: draft,
    title: draft ? `Document must be Published to Migrate` : null,
    label: 'Migrate',
    dialog: dialogOpen && published && {
      type: 'modal',
      content: <Migration docs={[published]} mode="action" />,
      onClose: () => onComplete(),
    },
    onHandle: () => setDialogOpen(true),
    icon: LaunchIcon,
  }
}
