/* eslint-disable react/jsx-no-bind */
import PropTypes from 'prop-types'
import React, {useState, useMemo, useEffect} from 'react'
import mapLimit from 'async/mapLimit'
import asyncify from 'async/asyncify'
import {extract, extractWithPath} from '@sanity/mutator'
import {dset} from 'dset'
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
import {typeIsAsset} from '../helpers'
import SelectButtons from './SelectButtons'

// Prepare origin (this Studio) client
const clientConfig = {apiVersion: `2021-05-19`}
const originClient = sanityClient.withConfig(clientConfig)

const stickyStyles = {
  position: 'sticky',
  top: 0,
  zIndex: 100,
  backgroundColor: `rgba(255,255,255,0.95)`,
}

// Recursively fetch Documents from an array of _id's and their references
// Heavy use of Set is to avoid recursively querying for id's already in the payload
async function getDocumentsInArray(fetchIds = [], currentIds = new Set()) {
  const collection = []
  const currentIdsSet = new Set(currentIds)

  // Find initial docs
  const data = await originClient.fetch(`*[_id in $fetchIds]`, {fetchIds})

  if (!data?.length) return collection

  // Find new ids in the returned data
  const newDataIds = new Set(
    data.map((dataDoc) => dataDoc._id).filter((id) => !currentIdsSet.has(id))
  )

  if (newDataIds.size) {
    collection.push(...data)
    currentIdsSet.add(...newDataIds)

    // Check new data for more references
    await Promise.all(
      data.map(async (doc) => {
        const expr = `.._ref`
        const references = extract(expr, doc)

        if (references.length) {
          // Check if these references are already in the Collection
          const newReferenceIds = new Set(references.filter((refId) => !currentIdsSet.has(refId)))

          if (newReferenceIds.size) {
            currentIdsSet.add(...newReferenceIds)

            // Recusive query for new documents
            const referenceDocs = await getDocumentsInArray(
              Array.from(newReferenceIds),
              currentIdsSet
            )

            if (referenceDocs) {
              collection.push(...referenceDocs)
            }
          }
        }
      })
    )
  }

  // One final unique filter
  // (possibly less importing, it was *querying* uniques that was the issue)
  return Array.from(new Set(collection))
}

export default function MigrationTool({docs = [], token = ``}) {
  const [destinationValue, setDestinationValue] = useState(``)
  const [spaces, setSpaces] = useState([])
  const [message, setMessage] = useState({})
  const [payload, setPayload] = useState([])
  const [hasReferences, setHasReferences] = useState(false)
  const [isMigrating, setIsMigrating] = useState(false)
  const [isGathering, setIsGathering] = useState(false)
  const [progress, setProgress] = useState([0, 0])

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
    setIsGathering(true)
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
    setIsGathering(false)
  }

  // Migrate payload to destination dataset
  async function handleMigrate() {
    setIsMigrating(true)

    const assetsCount = payload.filter(({doc, include}) => include && typeIsAsset(doc._type)).length
    let currentProgress = 0
    setProgress([currentProgress, assetsCount])

    setMessage({text: 'Migrating...'})

    const destinationClient = sanityClient.withConfig(clientConfig)
    destinationClient.clientConfig.dataset = destinationValue

    const transactionDocs = []
    const svgMaps = []

    // Upload assets and then add to transaction
    async function fetchDoc(doc) {
      if (typeIsAsset(doc._type)) {
        // Download and upload asset
        // Get the *original* image with this dlRaw param to create the same determenistic _id
        const uploadType = doc._type.split('.').pop().replace('Asset', '')
        const downloadUrl = uploadType === 'image' ? `${doc.url}?dlRaw=true` : doc.url
        const downloadConfig =
          uploadType === 'image' ? {headers: {Authorization: token ? `Bearer ${token}` : ``}} : {}

        await fetch(downloadUrl, downloadConfig).then(async (res) => {
          const assetData = await res.blob()

          const options = {filename: doc.originalFilename}
          const assetDoc = await destinationClient.assets.upload(uploadType, assetData, options)

          // SVG _id's need remapping before migration
          if (doc?.extension === 'svg') {
            svgMaps.push({old: doc._id, new: assetDoc._id})
          }

          transactionDocs.push(assetDoc)
        })

        currentProgress += 1
        setMessage({
          text: `Migrating ${currentProgress}/${assetsCount} ${
            assetsCount === 1 ? `Assets` : `Assets`
          }`,
        })

        return setProgress([currentProgress, assetsCount])
      }

      return transactionDocs.push(doc)
    }

    // Promises are limited to three at once
    const result = new Promise((resolve, reject) => {
      const payloadIncludedDocs = payload.filter((item) => item.include).map((item) => item.doc)

      mapLimit(payloadIncludedDocs, 3, asyncify(fetchDoc), (err) => {
        if (err) {
          reject(new Error('Migration Failed'))
        }

        resolve()
      })
    })

    await result

    // Remap SVG references to new _id's
    const transactionDocsMapped = transactionDocs.map((doc) => {
      const expr = `.._ref`
      const references = extractWithPath(expr, doc)

      if (!references.length) {
        return doc
      }

      // For every found _ref, search for an SVG asset _id and update
      references.forEach((ref) => {
        const newRefValue = svgMaps.find((asset) => asset.old === ref.value)?.new

        if (newRefValue) {
          const refPath = ref.path.join('.')

          dset(doc, refPath, newRefValue)
        }
      })

      return doc
    })

    // Create transaction
    const transaction = destinationClient.transaction()

    transactionDocsMapped.forEach((doc) => transaction.createOrReplace(doc))

    await transaction
      .commit()
      .then(() => {
        setMessage({tone: 'positive', text: 'Migration complete!'})
      })
      .catch((err) => {
        setMessage({tone: 'critical', text: err.details.description})
      })

    setIsMigrating(false)
    setProgress(0)
  }

  function handleChange(e) {
    setDestinationValue(e.currentTarget.value)
  }


  const payloadCount = payload.length
  const firstSvgIndex = payload.findIndex(({doc}) => doc.extension === 'svg')
  const selectedCount = payload.filter((item) => item.include).length

  if (!spaces.length) {
    return (
      <Card padding={3} radius={2} shadow={1} tone={'critical'}>
        <Text size={2}>
          No Spaces found in <code>sanity.json</code>
        </Text>
      </Card>
    )
  }

  return (
    <Container width={1}>
      <Card>
        <Stack>
          <>
            <Card borderBottom padding={4} style={stickyStyles}>
              <Stack space={4}>
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
                    <Label>To Destination</Label>
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

                {isMigrating && (
                  <Card border radius={2}>
                    <Card
                      style={{
                        width: '100%',
                        transform: `scaleX(${progress[0] / progress[1]})`,
                        transformOrigin: 'left',
                        transition: 'transform .2s ease',
                        boxSizing: 'border-box',
                      }}
                      padding={1}
                      tone="positive"
                    />
                  </Card>
                )}
                {payload.length > 0 && (
                  <>
                    <Label>
                      {`${selectedCount}/${payloadCount} ${
                        payloadCount === 1 ? `Document` : `Documents`
                      } selected to migrate`}
                    </Label>
                    <SelectButtons payload={payload} setPayload={setPayload} />
                  </>
                )}
              </Stack>
            </Card>
            {message?.text && (
              <Box paddingX={4} paddingTop={4}>
                <Card padding={3} radius={2} shadow={1} tone={message?.tone ?? 'transparent'}>
                  <Text size={1}>{message.text}</Text>
                </Card>
              </Box>
            )}
            {payload.length > 0 && (
              <Stack padding={4} space={3}>
                {payload.map(({doc, include, status}, index) => (
                  <React.Fragment key={doc._id}>
                    <Flex align="center">
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
                    {doc?.extension === 'svg' && index === firstSvgIndex && (
                      <Card padding={3} radius={2} shadow={1} tone="caution">
                        <Text size={1}>
                          Due to how SVGs are sanitized when first uploaded, SVG assets may have new{' '}
                          <code>_id</code>'s once migrated. The newly generated <code>_id</code>{' '}
                          will be the same in each migration, but it will never be the same{' '}
                          <code>_id</code> as the first time this Asset was uploaded.
                        </Text>
                      </Card>
                    )}
                  </React.Fragment>
                ))}
              </Stack>
            )}
            <Stack space={2} padding={4} paddingTop={0}>
              {hasReferences && (
                <Button
                  fontSize={2}
                  padding={4}
                  tone="positive"
                  mode="ghost"
                  icon={SearchIcon}
                  onClick={handleReferences}
                  text="Gather References"
                  disabled={isMigrating || isGathering}
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
                disabled={isMigrating || !selectedCount || isGathering}
              />
            </Stack>
          </>
        </Stack>
      </Card>
    </Container>
  )
}

MigrationTool.propTypes = {
  docs: PropTypes.arrayOf(PropTypes.shape({_id: PropTypes.string})).isRequired,
  token: PropTypes.string.isRequired,
}
