import React from 'react'
import {Button, Flex} from '@sanity/ui'
import sanityClient from 'part:@sanity/base/client'

import { clientConfig } from '../helpers/clientConfig'
import { SECRET_NAMESPACE } from '../helpers/constants'

const client = sanityClient.withConfig(clientConfig)

function handleClick() {
  client.delete({query: `*[_id == "secrets.${SECRET_NAMESPACE}"]`})
}

export default function ResetSecret() {
  return (
    <Flex align="center" justify="flex-end" paddingX={[2, 2, 2, 5]} paddingY={5}>
      <Button
        text="Reset Secret"
        onClick={() => handleClick()}
        mode="ghost"
        tone="critical"
        fontSize={1}
        padding={2}
      />
    </Flex>
  )
}
