import React from 'react'
import {useClient} from 'sanity'
import {Button, Flex} from '@sanity/ui'

import {clientConfig} from '../helpers/clientConfig'
import {SECRET_NAMESPACE} from '../helpers/constants'

export default function ResetSecret() {
  const client = useClient(clientConfig)

  const handleClick = React.useCallback(() => {
    client.delete({query: `*[_id == "secrets.${SECRET_NAMESPACE}"]`})
  }, [client])

  return (
    <Flex align="center" justify="flex-end" paddingX={[2, 2, 2, 5]} paddingY={5}>
      <Button
        text="Reset Secret"
        onClick={handleClick}
        mode="ghost"
        tone="critical"
        fontSize={1}
        padding={2}
      />
    </Flex>
  )
}
