import {useState, useEffect} from 'react'
import {Grid, Card, Container, Button} from '@sanity/ui'
import {SanityDocument, useClient} from 'sanity'

import type {DuplicatorProps} from './Duplicator'
import Duplicator from './Duplicator'
import {clientConfig} from '../helpers/clientConfig'

export default function DuplicatorWrapper(props: DuplicatorProps) {
  const {docs, token, pluginConfig} = props
  const [inbound, setInbound] = useState<SanityDocument[]>([])
  const {follow = []} = pluginConfig

  // Make the first mode the default if there's only one
  const [mode, setMode] = useState<'inbound' | 'outbound'>(
    follow.length === 1 ? follow[0] : `outbound`
  )
  const client = useClient(clientConfig)

  // "Inbound" will start with all documents that reference the first one
  // And then you can gather "Outbound" references thereafter
  useEffect(() => {
    ;(async () => {
      if (follow.includes(`inbound`)) {
        const inboundReferences = await client.fetch(`*[references($id)]`, {id: docs[0]._id})
        setInbound([...props.docs, ...inboundReferences])
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Container>
      {follow.length > 1 && (follow.includes(`inbound`) || follow.includes(`outbound`)) ? (
        <Card paddingX={4} paddingBottom={4} marginBottom={4} borderBottom>
          <Grid columns={2} gap={4}>
            {follow.includes(`outbound`) ? (
              <Button
                mode="ghost"
                tone="primary"
                selected={mode === 'outbound'}
                onClick={() => setMode('outbound')}
                text="Outbound"
              />
            ) : null}
            {follow.includes(`inbound`) ? (
              <Button
                mode="ghost"
                tone="primary"
                selected={mode === 'inbound'}
                onClick={() => setMode('inbound')}
                disabled={inbound.length === 0}
                text={inbound.length > 0 ? `Inbound (${inbound.length})` : 'No inbound references'}
              />
            ) : null}
          </Grid>
        </Card>
      ) : null}
      <Duplicator
        docs={mode === 'outbound' ? docs : inbound}
        token={token}
        // draftIds={[]}
        pluginConfig={pluginConfig}
      />
    </Container>
  )
}
