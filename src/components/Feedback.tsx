import React from 'react'
import {Card, Text} from '@sanity/ui'
import type {BadgeTone} from '@sanity/ui'

type FeedbackProps = {
  children?: React.ReactNode
  tone?: BadgeTone
}

export default function Feedback(props: FeedbackProps) {
  const {children, tone = `caution`} = props

  return (
    <Card padding={3} radius={2} shadow={1} tone={tone}>
      <Text size={1}>{children}</Text>
    </Card>
  )
}
