import React, {useEffect, useState} from 'react'
import PropTypes from 'prop-types'
import sanityClient from 'part:@sanity/base/client'
import {Button, Stack, Box, Label, Text, Card, Flex, Grid, Container, TextInput} from '@sanity/ui'

import MigrationTool from './MigrationTool'

const apiVersion = `2021-05-19`
const originClient = sanityClient.withConfig({apiVersion})

export default function MigrationQuery({token}) {
  // const [value, setValue] = useState(`*[_type == "article"]`)
  const [value, setValue] = useState(``)
  const [docs, setDocs] = useState([])

  function handleSubmit(e) {
    if (e) e.preventDefault()

    originClient
      .fetch(value)
      .then((res) => setDocs(res))
      .catch((err) => console.error(err))
  }

  // Auto-load initial textinput value
  useEffect(() => {
    if (!docs.length && value) {
      handleSubmit()
    }
  }, [])

  return (
    <Container width={3} padding={[0, 0, 0, 5]}>
      <Grid columns={[1, 1, 1, 2]} gap={[1, 1, 1, 4]}>
        <Box padding={[2, 2, 2, 0]}>
          <Card padding={4} scheme="dark" radius={3}>
            <Stack space={4}>
              <Box>
                <Label>Initial Documents Query</Label>
              </Box>
              <Box>
                <Text>
                  Start with a valid GROQ query to load initial documents. The query will need to
                  return an Array of Objects.
                </Text>
              </Box>
              <form onSubmit={handleSubmit}>
                <Flex>
                  <Box flex={1} paddingRight={2}>
                    <TextInput
                      style={{fontFamily: 'monospace'}}
                      fontSize={2}
                      // eslint-disable-next-line react/jsx-no-bind
                      onChange={(event) => setValue(event.currentTarget.value)}
                      padding={4}
                      placeholder={`*[_type == "article"]`}
                      value={value ?? ``}
                    />
                  </Box>
                  <Button
                    padding={2}
                    paddingX={4}
                    tone="primary"
                    onClick={handleSubmit}
                    text="Query"
                    disabled={!value}
                  />
                </Flex>
              </form>
            </Stack>
          </Card>
        </Box>
        {!docs?.length > 0 && (
          <Container width={1}>
            <Card padding={5}>
              {value ? `No Documents match this query` : `Start with a valid GROQ query`}
            </Card>
          </Container>
        )}
        {docs?.length > 0 && <MigrationTool docs={docs} token={token} />}
      </Grid>
    </Container>
  )
}

MigrationQuery.propTypes = {
  token: PropTypes.string.isRequired,
}
