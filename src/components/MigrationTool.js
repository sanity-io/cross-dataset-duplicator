/* eslint-disable react/jsx-no-bind */
import PropTypes from 'prop-types'
import React, {useState, useMemo, useEffect} from 'react'
import {extract} from '@sanity/mutator'
import {
  Card,
  Container,
  Text,
  Box,
  Button,
  Label,
  Stack,
  Select,
  Flex,
  Checkbox,
  Badge,
} from '@sanity/ui'
import {ArrowRightIcon, SearchIcon, LaunchIcon} from '@sanity/icons'
import sanityClient from 'part:@sanity/base/client'
import Preview from 'part:@sanity/base/preview'
import schema from 'part:@sanity/base/schema'
import config from 'config:sanity'

// Prepare origin (this Studio) client
const clientConfig = {apiVersion: `2021-05-19`}
const originClient = sanityClient.withConfig(clientConfig)

// Recursively fetch Documents from an array of _id's and their references
async function getDocumentsInArray(arr, depth = 1) {
  const collection = []

  // Find initial docs
  const data = await originClient.fetch(`*[_id in $arr]`, {arr})

  if (data?.length) {
    collection.push(...data)

    // Check new data for more references
    await Promise.all(
      data.map(async (doc) => {
        const expr = `.._ref`
        const references = extract(expr, doc)

        if (references?.length) {
          const referenceDocs = await getDocumentsInArray(references, depth + 1)
          collection.push(...referenceDocs)
        }
      })
    )
  }

  // Filter to uniques
  const uniqueCollection = collection.reduce((acc, cur) => {
    if (acc.find((doc) => doc._id === cur._id)) {
      return acc
    }

    return [...acc, cur]
  }, [])

  return uniqueCollection
}

export default function MigrationTool({docs = [], token = ``}) {
  const [destinationValue, setDestinationValue] = useState(``)
  const [spaces, setSpaces] = useState([])
  const [message, setMessage] = useState({})
  const [payload, setPayload] = useState([])
  const [hasReferences, setHasReferences] = useState(false)
  const [isMigrating, setIsMigrating] = useState(false)
  const [progress, setProgress] = useState(0)

  const originDataset = useMemo(() => sanityClient.clientConfig.dataset, [])

  // Check for References and update message
  useEffect(() => {
    const expr = `.._ref`
    const initialRefs = []
    const initialPayload = []

    docs.forEach((doc) => {
      initialRefs.push(...extract(expr, doc))
      initialPayload.push({include: true, doc})
    })

    setPayload(initialPayload)

    const docCount = docs.length
    const refsCount = initialRefs.length

    if (initialRefs.length) {
      setHasReferences(true)

      setMessage({
        tone: `caution`,
        text: `${
          docCount === 1 ? `This Document contains` : `These ${docCount} Documents contain`
        } ${refsCount === 1 ? `1 Reference` : `${refsCount} References`}. ${
          refsCount === 1 ? `That Document` : `Those Documents`
        }  may have References too. If Referenced Documents do not exist at the target Destination, this Migration will fail.`,
      })
    }
  }, [docs])

  // Create list of dataset options
  // and set initial value of dropdown
  useEffect(() => {
    if (!spaces.length && config?.__experimental_spaces) {
      const spacesOptions = config.__experimental_spaces.map((space) => ({
        ...space,
        disabled: space.name === originDataset,
      }))

      if (!destinationValue) {
        setDestinationValue(spacesOptions.filter((space) => !space.disabled)[0].name)
      }

      setSpaces(spacesOptions)
    }
  }, [])

  // Re-check payload on destination when value changes
  // (On initial render + select change)
  useEffect(() => {
    updatePayloadStatuses()
  }, [destinationValue])

  // Check if payload documents exist at destination
  async function updatePayloadStatuses(newPayload = []) {
    const payloadActual = newPayload.length ? newPayload : payload

    if (!payloadActual.length || !destinationValue) {
      return
    }

    const payloadIds = payloadActual.map(({doc}) => doc._id)
    const destinationClient = sanityClient.withConfig(clientConfig)
    destinationClient.clientConfig.dataset = destinationValue
    const destinationData = await destinationClient.fetch(`*[_id in $payloadIds]._id`, {payloadIds})

    const updatedPayload = payloadActual.map((item) => {
      item.status = destinationData.includes(item.doc._id) ? 'EXISTS' : ''

      return item
    })

    setPayload(updatedPayload)
  }

  function handleCheckbox(_id) {
    const updatedPayload = payload.map((item) => {
      if (item.doc._id === _id) {
        item.include = !item.include
      }

      return item
    })

    setPayload(updatedPayload)
  }

  // Find and recursively follow references beginning with this document
  async function handleReferences() {
    const docIds = docs.map((doc) => doc._id)

    if (!docIds.length) {
      return
    }

    const payloadDocs = await getDocumentsInArray(docIds)

    // Shape it up
    const payloadShaped = payloadDocs.map((doc) => ({
      doc,
      // Include this in the migration?
      include: true,
      // Does it exist at the destination?
      status: '',
    }))

    setPayload(payloadShaped)
    updatePayloadStatuses(payloadShaped)
  }

  // Migrate payload to destination dataset
  async function handleMigrate() {
    setIsMigrating(true)
    const migrationCount = payload.filter((doc) => doc.include).length
    let currentProgress = 0
    setProgress(currentProgress)

    setMessage({text: 'Migrating...'})

    const destinationClient = sanityClient.withConfig(clientConfig)
    destinationClient.clientConfig.dataset = destinationValue

    const transaction = destinationClient.transaction()

    // Upload assets before the transaction
    // Add Documents to the transaction
    await Promise.all(
      payload
        .filter((doc) => doc.include)
        .map(async ({doc}) => {
          if (['sanity.imageAsset', 'sanity.fileAsset'].includes(doc._type)) {
            // Download and upload asset
            // Get the *original* image with this dlRaw param to create the same determenistic _id
            const uploadType = doc._type.split('.').pop().replace('Asset', '')
            const downloadUrl = uploadType === 'image' ? `${doc.url}?dlRaw=true` : doc.url
            const downloadConfig =
              uploadType === 'image'
                ? {headers: {Authorization: token ? `Bearer ${token}` : ``}}
                : {}

            await fetch(downloadUrl, downloadConfig).then(async (res) => {
              const assetData = await res.blob()

              const options = {filename: doc.originalFilename}
              const assetDoc = await destinationClient.assets.upload(uploadType, assetData, options)

              return transaction.createOrReplace(assetDoc)
            })

            currentProgress = Math.round((currentProgress + 100 / migrationCount) * 100) / 100
            setMessage({text: `Migration ${currentProgress}% Complete`})
            return setProgress(currentProgress)
          }

          await transaction.createOrReplace(doc)

          currentProgress = Math.round((currentProgress + 100 / migrationCount) * 100) / 100
          setMessage({text: `Migration ${currentProgress}% Complete`})
          return setProgress(currentProgress)
        })
    )

    return transaction
      .commit()
      .then(() => {
        setMessage({tone: 'positive', text: 'Migration complete!'})
        setIsMigrating(false)
      })
      .catch((err) => {
        setMessage({tone: 'critical', text: err.details.description})
        setIsMigrating(false)
      })
  }

  function handleChange(e) {
    setDestinationValue(e.currentTarget.value)
  }

  const payloadCount = payload.length
  const selectedCount = payload.filter((doc) => doc.include).length

  if (!spaces.length) {
    return <div>No spaces?!</div>
  }

  return (
    <Container width={1}>
      <Card padding={0}>
        <Stack space={5}>
          <>
            <Stack
              paddingY={3}
              space={3}
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 100,
                backgroundColor: `rgba(255,255,255,0.9)`,
              }}
            >
              <Flex space={3}>
                <Stack style={{flex: 1}} space={3}>
                  <Label>Migrate from</Label>
                  <Select readOnly value={spaces.find((space) => space.disabled).name}>
                    {spaces

                      .filter((space) => space.disabled)
                      .map((space) => (
                        <option key={space.name} value={space.name} disabled={space.disabled}>
                          {space.title ?? space.name}
                          {space.disabled ? ` (Current)` : ``}
                        </option>
                      ))}
                  </Select>
                </Stack>
                <Box padding={4} paddingTop={5} paddingBottom={0}>
                  <Text size={3}>
                    <ArrowRightIcon />
                  </Text>
                </Box>
                <Stack style={{flex: 1}} space={3}>
                  <Label>To Destination Dataset</Label>
                  <Select onChange={handleChange}>
                    {spaces.map((space) => (
                      <option key={space.name} value={space.name} disabled={space.disabled}>
                        {space.title ?? space.name}
                        {space.disabled ? ` (Current)` : ``}
                      </option>
                    ))}
                  </Select>
                </Stack>
              </Flex>
              {message?.text && (
                <Card padding={3} radius={2} shadow={1} tone={message?.tone ?? 'transparent'}>
                  <Text size={1}>{message.text}</Text>
                </Card>
              )}
              {progress > 0 && progress < 100 && (
                <Card border radius={2}>
                  <Card
                    style={{
                      width: '100%',
                      transform: `scaleX(${progress / 100})`,
                      transformOrigin: 'left',
                      transition: 'transform .2s ease',
                      boxSizing: 'border-box',
                    }}
                    padding={1}
                    tone="positive"
                  />
                </Card>
              )}
            </Stack>
            {payload.length > 0 && (
              <Stack space={3}>
                <Label>
                  {`${selectedCount}/${payloadCount} ${
                    payloadCount === 1 ? `Document` : `Documents`
                  } to Migrate`}
                </Label>
                {payload.map(({doc, include, status}) => (
                  <Flex key={doc._id} align="center">
                    <Checkbox checked={include} onChange={() => handleCheckbox(doc._id)} />
                    <Box style={{flex: 1}} paddingX={3}>
                      <Preview value={doc} type={schema.get(doc._type)} />
                    </Box>
                    {status === 'EXISTS' ? (
                      <Badge muted padding={2} fontSize={1} tone="caution" mode="outline">
                        Update
                      </Badge>
                    ) : (
                      <Badge muted padding={2} fontSize={1} tone="positive" mode="outline">
                        Create
                      </Badge>
                    )}
                  </Flex>
                ))}
              </Stack>
            )}
            <Stack space={2}>
              {hasReferences && (
                <Button
                  fontSize={2}
                  padding={4}
                  tone="positive"
                  mode="ghost"
                  icon={SearchIcon}
                  onClick={handleReferences}
                  text="Gather References"
                  disabled={isMigrating}
                />
              )}
              <Button
                fontSize={2}
                padding={4}
                tone="positive"
                icon={LaunchIcon}
                onClick={handleMigrate}
                text={`Migrate ${selectedCount} ${
                  selectedCount === 1 ? `Document` : `Documents`
                } to ${spaces.find((space) => space.name === destinationValue)?.title}`}
                disabled={isMigrating || !selectedCount}
              />
            </Stack>
          </>
        </Stack>
      </Card>
    </Container>
  )
}

MigrationTool.propTypes = {
  docs: PropTypes.array.isRequired,
  token: PropTypes.string.isRequired,
}
