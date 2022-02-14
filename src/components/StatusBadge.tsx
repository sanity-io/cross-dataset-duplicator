import React from 'react'
import {Box, Text, Badge, Tooltip, Container} from '@sanity/ui'
import type {BadgeTone} from '@sanity/ui'

type StatusTones = {
  default?: BadgeTone
  EXISTS: BadgeTone
  OVERWRITE: BadgeTone
  UPDATE: BadgeTone
  CREATE: BadgeTone
}

const statusTones: StatusTones = {
  default: `default`,
  EXISTS: `primary`,
  OVERWRITE: `critical`,
  UPDATE: `caution`,
  CREATE: `positive`,
}

type StatusMessages = {
  EXISTS: string
  OVERWRITE: string
  UPDATE: string
  CREATE: string
}

const statusMessages: StatusMessages = {
  // Only happens once document is copied the first time, and _updatedAt is the same
  EXISTS: `This document already exists at the Destination with the same ID with the same Updated time.`,
  // Is true immediately after migration as _updatedAt is updated by API after mutation
  // Is also true if the document at the destination has been manually modified
  // Presently, the plugin doesn't actually compare the two documents
  OVERWRITE: `A newer version of this document exists at the Destination, and it will be overwritten with this version.`,
  // Document at destination is older
  UPDATE: `An older version of this document exists at the Destination, and it will be overwritten with this version.`,
  // Document at destination doesn't exist
  CREATE: `This document will be created at the destination.`,
}

type StatusBadgeProps = {
  status: 'EXISTS' | 'OVERWRITE' | 'UPDATE' | 'CREATE' | undefined
}

export default function StatusBadge(props: StatusBadgeProps) {
  const {status} = props

  if (!statusTones[status]) {
    return (
      <Badge muted padding={2} fontSize={1} tone={statusTones.default} mode="outline">
        Checking...
      </Badge>
    )
  }

  return (
    <Tooltip
      content={
        <Box padding={3} style={{maxWidth: 200}}>
          <Text size={1}>{statusMessages[status]}</Text>
        </Box>
      }
      fallbackPlacements={['right', 'left']}
      placement="top"
      portal
    >
      <Badge muted padding={2} fontSize={1} tone={statusTones[status]} mode="outline">
        {status}
      </Badge>
    </Tooltip>
  )
}
