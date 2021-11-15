import React from 'react'
import PropTypes from 'prop-types'
import {Card, Text} from '@sanity/ui'

export default function Feedback({children}) {
  return (
    <Card padding={3} radius={2} shadow={1} tone="caution">
      <Text size={1}>{children}</Text>
    </Card>
  )
}

Feedback.propTypes = {
  children: PropTypes.node.isRequired,
}
