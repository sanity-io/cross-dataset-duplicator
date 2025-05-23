import {useEffect, useState} from 'react'
import {Button, Stack, Box, Label, Text, Card, Flex, Grid, Container, TextInput} from '@sanity/ui'
import {useSchema, useClient, SanityDocument} from 'sanity'

import Duplicator from './Duplicator'
import {PluginConfig} from '../types'

type DuplicatorQueryProps = {
  token: string
  pluginConfig: Required<PluginConfig>
}

type InitialData = {
  docs: SanityDocument[]
}

export default function DuplicatorQuery(props: DuplicatorQueryProps) {
  const {token, pluginConfig} = props

  const {queries: preDefinedQueries, apiVersion} = pluginConfig
  const originClient = useClient({apiVersion})

  const schema = useSchema()
  const schemaTypes = schema.getTypeNames()

  const [value, setValue] = useState(``)
  const [fetched, setFetched] = useState(false)
  const [initialData, setInitialData] = useState<InitialData>({
    docs: [],
  })
  function handleSubmit(e?: any) {
    if (e) e.preventDefault()

    originClient
      .fetch(value)
      .then((res: SanityDocument[]) => {
        // Ensure queried docs are registered to the schema
        const registeredAndPublishedDocs = res.length
          ? res
              .filter((doc) => schemaTypes.includes(doc._type))
              .filter((doc) => !doc._id.startsWith(`drafts.`))
          : []

        setInitialData({
          docs: registeredAndPublishedDocs,
        })
        setFetched(true)
      })
      .catch((err) => console.error(err))
  }

  // Auto-load initial textinput value
  useEffect(() => {
    if (!initialData.docs?.length && value) {
      handleSubmit()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Card padding={[0, 0, 0, 5]}>
      <Container>
        <Grid columns={[1, 1, 1, 2]} gap={[1, 1, 1, 4]}>
          <Box padding={[2, 2, 2, 0]}>
            <Card padding={4} radius={3} border>
              <Stack space={4}>
                <Box>
                  <Label>Initial Documents Query</Label>
                </Box>
                <Box>
                  <Text>
                    Start with a valid GROQ query to load initial documents. The query will need to
                    return an Array of Objects. Drafts will be removed from the results.
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
            {preDefinedQueries && preDefinedQueries?.length > 0 && (
              <Card marginTop={2} padding={4} radius={3} border>
                <Box>
                  <Stack space={4}>
                    <Box>
                      <Label>Predefined Queries</Label>
                    </Box>
                    <Stack space={2}>
                      {preDefinedQueries.map((query) => (
                        <Button
                          key={query.label.replace(/\s+/g, '-')}
                          padding={2}
                          paddingX={4}
                          tone="primary"
                          onClick={() => setValue(`*[${query.query}]`)}
                          text={query.label}
                        />
                      ))}
                    </Stack>
                  </Stack>
                </Box>
              </Card>
            )}
          </Box>
          {fetched && initialData.docs.length < 1 && (
            <Container width={1}>
              <Card padding={5}>
                {value ? `No documents match this query` : `Start with a valid GROQ query`}
              </Card>
            </Container>
          )}
          {initialData.docs?.length > 0 && (
            <Duplicator
              docs={initialData.docs}
              // draftIds={initialData.draftIds}
              token={token}
              pluginConfig={pluginConfig}
            />
          )}
        </Grid>
      </Container>
    </Card>
  )
}
