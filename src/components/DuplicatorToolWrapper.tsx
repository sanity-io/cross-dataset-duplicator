import React, {useState, useEffect} from 'react'
import {Grid, Card, Container, Button} from '@sanity/ui'
import {SanityDocument, useClient} from 'sanity'
import type {DuplicatorToolProps} from './DuplicatorTool'
import DuplicatorTool from './DuplicatorTool'

export default function DuplicatorToolWrapper(props: DuplicatorToolProps) {
  const {docs, token, config} = props
  const [mode, setMode] = useState('outbound')
  const [inbound, setInbound] = useState<SanityDocument[]>([])
  const {follow = []} = config
  const client = useClient()

  useEffect(() => {
    ;(async () => {
      const inboundReferences = await client.fetch(`*[references($id)]`, {id: docs[0]._id})
      setInbound([...props.docs, ...inboundReferences])
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Container>
      {follow.includes(`inbound`) || follow.includes(`outbound`) ? (
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
      <DuplicatorTool
        docs={mode === 'outbound' ? docs : inbound}
        token={token}
        draftIds={[]}
        config={config}
      />
    </Container>
  )
}
