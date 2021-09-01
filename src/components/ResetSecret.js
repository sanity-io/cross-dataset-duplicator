import {Button, Flex} from '@sanity/ui'
import React from 'react'
import sanityClient from 'part:@sanity/base/client'

const apiVersion = `2021-05-19`
const client = sanityClient.withConfig({apiVersion})

export default function ResetSecret() {
  function handleClick() {
    client.delete({query: `*[_id == "secrets.Migration"]`})
  }

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
