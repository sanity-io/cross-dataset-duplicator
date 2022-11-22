/* eslint-disable react/jsx-no-bind */
import React, {useState, useEffect} from 'react'
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
  Grid,
} from '@sanity/ui'
import {ArrowRightIcon, SearchIcon, LaunchIcon} from '@sanity/icons'
import sanityClient from 'part:@sanity/base/client'
import Preview from 'part:@sanity/base/preview'
import schema from 'part:@sanity/base/schema'
import config from 'config:sanity'

import {typeIsAsset, stickyStyles, createInitialMessage} from '../helpers'
import {getDocumentsInArray} from '../helpers/getDocumentsInArray'
import SelectButtons from './SelectButtons'
import StatusBadge from './StatusBadge'
import Feedback from './Feedback'
import {SanityDocument} from '../types'
import {clientConfig} from '../helpers/clientConfig'

type DuplicatorToolProps = {
  docs: SanityDocument[]
  draftIds: string[]
  token: string
}

export default function DuplicatorTool(props: DuplicatorToolProps) {
  const {docs, draftIds, token} = props

  // Prepare origin (this Studio) client
  // In function-scope so it is up to date on every render
  const originClient = sanityClient.withConfig(clientConfig)

  // Create list of dataset options
  // and set initial value of dropdown
  const spacesOptions = config?.__experimental_spaces?.length
    ? config.__experimental_spaces.map((space) => ({
        ...space,
        api: {
          ...space.api,
          projectId: space.api.projectId || process.env.SANITY_STUDIO_API_PROJECT_ID,
        },
        usingEnvForProjectId: !space.api.projectId && process.env.SANITY_STUDIO_API_PROJECT_ID,
        disabled:
          space.api.dataset === originClient.config().dataset &&
          space.api.projectId === originClient.config().projectId,
      }))
    : []

  const [destination, setDestination] = useState(
    spacesOptions.length ? spacesOptions.find((space) => !space.disabled) : {}
  )
  const [message, setMessage] = useState({})
  const [payload, setPayload] = useState(
    docs.length
      ? docs.map((item) => ({
          doc: item,
          include: true,
          status: null,
          hasDraft: draftIds?.length ? draftIds.includes(`drafts.${item._id}`) : false,
        }))
      : []
  )
  const [hasReferences, setHasReferences] = useState(false)
  const [referees, setReferees] = useState([])
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [isGathering, setIsGathering] = useState(false)
  const [progress, setProgress] = useState([0, 0])

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
        text: createInitialMessage(docCount, refsCount),
      })
    }

    ;(async () => {
      const referees = await sanityClient.fetch('*[references($id)]', {id: docs[0]._id})

      if (referees.length) {
        setReferees(referees)
      }
    })()
  }, [docs])

  // Re-check payload on destination when value changes
  // (On initial render + select change)
  useEffect(() => {
    updatePayloadStatuses()
  }, [destination, docs])

  // Check if payload documents exist at destination
  async function updatePayloadStatuses(newPayload = []) {
    const payloadActual = newPayload.length ? newPayload : payload

    if (!payloadActual.length || !destination?.name) {
      return
    }

    const payloadIds = payloadActual.map(({doc}) => doc._id)
    const destinationClient = sanityClient.withConfig({
      ...clientConfig,
      dataset: destination.api.dataset,
      projectId: destination.api.projectId,
    })
    const destinationData = await destinationClient.fetch(
      `*[_id in $payloadIds]{ _id, _updatedAt }`,
      {payloadIds}
    )

    const updatedPayload = payloadActual.map((item) => {
      const existingDoc = destinationData.find((doc) => doc._id === item.doc._id)

      if (existingDoc?._updatedAt && item?.doc?._updatedAt) {
        if (existingDoc._updatedAt === item.doc._updatedAt) {
          // Exact same document exists at destination
          // We don't compare by _rev because that is updated in a transaction
          item.status = `EXISTS`
        } else if (existingDoc._updatedAt && item.doc._updatedAt) {
          item.status =
            new Date(existingDoc._updatedAt) > new Date(item.doc._updatedAt)
              ? // Document at destination is newer
                `OVERWRITE`
              : // Document at destination is older
                `UPDATE`
        }
      } else {
        item.status = 'CREATE'
      }

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
  async function handleReferences(docs) {
    setIsGathering(true)
    const docIds = docs.map((doc) => doc._id)

    const payloadDocs = await getDocumentsInArray(docIds, originClient, null)
    const draftDocs = await getDocumentsInArray(
      docIds.map((id) => `drafts.${id}`),
      originClient,
      null,
      `{_id}`
    )
    const draftDocsIds = new Set(draftDocs.map(({_id}) => _id))

    // Shape it up
    const payloadShaped = payloadDocs.map((doc) => ({
      doc,
      // Include this in the transaction?
      include: true,
      // Does it exist at the destination?
      status: '',
      // Does it have any drafts?
      hasDraft: draftDocsIds.has(`drafts.${doc._id}`),
    }))

    setPayload(payloadShaped)
    updatePayloadStatuses(payloadShaped)
    setIsGathering(false)
  }

  // Duplicate payload to destination dataset
  async function handleDuplicate() {
    setIsDuplicating(true)

    const assetsCount = payload.filter(({doc, include}) => include && typeIsAsset(doc._type)).length
    let currentProgress = 0
    setProgress([currentProgress, assetsCount])

    setMessage({text: 'Duplicating...'})

    const destinationClient = sanityClient.withConfig({
      ...clientConfig,
      dataset: destination.api.dataset,
      projectId: destination.api.projectId,
    })

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
          uploadType === 'image' ? {headers: {Authorization: `Bearer ${token}`}} : {}

        await fetch(downloadUrl, downloadConfig).then(async (res) => {
          const assetData = await res.blob()

          const options = {filename: doc.originalFilename}
          const assetDoc = await destinationClient.assets.upload(uploadType, assetData, options)

          // SVG _id's need remapping before transaction
          if (doc?.extension === 'svg') {
            svgMaps.push({old: doc._id, new: assetDoc._id})
          }

          transactionDocs.push(assetDoc)
        })

        currentProgress += 1
        setMessage({
          text: `Duplicating ${currentProgress}/${assetsCount} ${
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
          setIsDuplicating(false)
          setMessage({tone: 'critical', text: `Duplication Failed`})
          console.error(err)
          reject(new Error('Duplication Failed'))
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

    transactionDocsMapped.forEach((doc) => {
      transaction.createOrReplace(doc)
    })

    await transaction
      .commit()
      .then((res) => {
        setMessage({tone: 'positive', text: 'Duplication complete!'})

        updatePayloadStatuses()
      })
      .catch((err) => {
        setMessage({tone: 'critical', text: err.details.description})
      })

    setIsDuplicating(false)
    setProgress(0)
  }

  function handleChange(e) {
    setDestination(spacesOptions.find((space) => space.name === e.currentTarget.value))
  }

  if (!spacesOptions.length) {
    return (
      <Feedback tone="critical">
        <code>__experimental_spaces</code> not found in <code>sanity.json</code>
      </Feedback>
    )
  }

  const payloadCount = payload.length
  const firstSvgIndex = payload.findIndex(({doc}) => doc.extension === 'svg')
  const selectedDocumentsCount = payload.filter(
    (item) => item.include && !typeIsAsset(item.doc._type)
  ).length
  const selectedAssetsCount = payload.filter(
    (item) => item.include && typeIsAsset(item.doc._type)
  ).length
  const selectedTotal = selectedDocumentsCount + selectedAssetsCount
  const destinationTitle = destination?.title ?? destination?.name
  const hasMultipleProjectIds =
    new Set(spacesOptions.map((space) => space?.api?.projectId).filter(Boolean)).size > 1

  const headingText = [selectedTotal, `/`, payloadCount, `Documents and Assets selected`].join(` `)

  const buttonText = React.useMemo(() => {
    const text = [`Duplicate`]

    if (selectedDocumentsCount > 1) {
      text.push(selectedDocumentsCount, selectedDocumentsCount === 1 ? `Document` : `Documents`)
    }

    if (selectedAssetsCount > 1) {
      text.push(`and`, selectedAssetsCount, selectedAssetsCount === 1 ? `Asset` : `Assets`)
    }

    if (originClient.config().projectId !== destination.api.projectId) {
      text.push(`between Projects`)
    }

    text.push(`to`, destinationTitle)

    return text.join(` `)
  }, [selectedDocumentsCount, selectedAssetsCount, destinationTitle])

  return (
    <Container width={1}>
      <Card>
        <Stack>
          <>
            <Card borderBottom padding={4} style={stickyStyles}>
              <Stack space={4}>
                <Flex space={3}>
                  <Stack style={{flex: 1}} space={3}>
                    <Label>Duplicate from</Label>
                    <Select readOnly value={spacesOptions.find((space) => space.disabled)?.name}>
                      {spacesOptions
                        .filter((space) => space.disabled)
                        .map((space) => (
                          <option key={space.name} value={space.name} disabled={space.disabled}>
                            {space.title ?? space.name}
                            {hasMultipleProjectIds || space.usingEnvForProjectId
                              ? ` (${space.api.projectId})`
                              : ``}
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
                      {spacesOptions.map((space) => (
                        <option key={space.name} value={space.name} disabled={space.disabled}>
                          {space.title ?? space.name}
                          {hasMultipleProjectIds || space.usingEnvForProjectId
                            ? ` (${space.api.projectId})`
                            : ``}
                          {space.disabled ? ` (Current)` : ``}
                        </option>
                      ))}
                    </Select>
                  </Stack>
                </Flex>

                {isDuplicating && (
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
                    <Label>{headingText}</Label>
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
                {payload.map(({doc, include, status, hasDraft}, index) => (
                  <React.Fragment key={doc._id}>
                    <Flex align="center">
                      <Checkbox checked={include} onChange={() => handleCheckbox(doc._id)} />
                      <Box flex={1} paddingX={3}>
                        <Preview value={doc} type={schema.get(doc._type)} />
                      </Box>
                      <Flex items="center" gap={2}>
                        {hasDraft ? <StatusBadge status="UNPUBLISHED" isAsset={false} /> : null}
                        <StatusBadge status={status} isAsset={typeIsAsset(doc._type)} />
                      </Flex>
                    </Flex>
                    {doc?.extension === 'svg' && index === firstSvgIndex && (
                      <Card padding={3} radius={2} shadow={1} tone="caution">
                        <Text size={1}>
                          Due to how SVGs are sanitized after first uploaded, duplicated SVG assets
                          may have new <code>_id</code>'s at the destination. The newly generated{' '}
                          <code>_id</code> will be the same in each duplication, but it will never
                          be the same <code>_id</code> as the first time this Asset was uploaded.
                          References to the asset will be updated to use the new <code>_id</code>.
                        </Text>
                      </Card>
                    )}
                  </React.Fragment>
                ))}
              </Stack>
            )}
            <Stack space={2} padding={4} paddingTop={0}>
              {(referees.length > 0 || hasReferences) && (
                <Grid columns={referees.length > 0 && hasReferences ? 2 : 1} gap={2}>
                  {hasReferences && (
                    <Button
                      fontSize={2}
                      padding={4}
                      tone="positive"
                      mode="ghost"
                      icon={SearchIcon}
                      onClick={() => handleReferences(docs)}
                      text="Gather References"
                      disabled={isDuplicating || !selectedTotal || isGathering}
                    />
                  )}
                  {referees.length > 0 && (
                    <Button
                      fontSize={2}
                      padding={4}
                      tone="positive"
                      mode="ghost"
                      icon={SearchIcon}
                      onClick={() => handleReferences(referees)}
                      text="Gather Referee References"
                      disabled={isDuplicating || !selectedTotal || isGathering}
                    />
                  )}
                </Grid>
              )}
              <Button
                fontSize={2}
                padding={4}
                tone="positive"
                icon={LaunchIcon}
                onClick={handleDuplicate}
                text={buttonText}
                disabled={isDuplicating || !selectedTotal || isGathering}
              />
            </Stack>
          </>
        </Stack>
      </Card>
    </Container>
  )
}
