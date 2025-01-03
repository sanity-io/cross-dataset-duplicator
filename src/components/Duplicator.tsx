/* eslint-disable react/jsx-no-bind */
import React, {useState, useEffect} from 'react'
import {
  useClient,
  Preview,
  useSchema,
  useWorkspaces,
  WorkspaceSummary,
  SanityDocument,
} from 'sanity'
// @ts-ignore
import mapLimit from 'async/mapLimit'
// @ts-ignore
import asyncify from 'async/asyncify'
import {extractWithPath} from '@sanity/mutator'
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
  CardTone,
  useTheme,
  Spinner,
} from '@sanity/ui'
import {ArrowRightIcon, SearchIcon, LaunchIcon} from '@sanity/icons'
import {SanityAssetDocument} from '@sanity/client'
import {isAssetId, isSanityFileAsset} from '@sanity/asset-utils'

import {stickyStyles, createInitialMessage} from '../helpers'
import {getDocumentsInArray} from '../helpers/getDocumentsInArray'
import SelectButtons from './SelectButtons'
import StatusBadge, {MessageTypes} from './StatusBadge'
import Feedback from './Feedback'
import {clientConfig} from '../helpers/clientConfig'
import {PluginConfig} from '../types'

export type DuplicatorProps = {
  docs: SanityDocument[]
  // TODO: Find out if this is even used?
  // draftIds: string[]
  token: string
  pluginConfig: PluginConfig
  onDuplicated?: () => Promise<void>
}

export type PayloadItem = {
  doc: SanityDocument
  include: boolean
  status?: keyof MessageTypes
  hasDraft?: boolean
}

type WorkspaceOption = WorkspaceSummary & {
  disabled: boolean
}

type Message = {
  text: string
  tone: CardTone
}

export default function Duplicator(props: DuplicatorProps) {
  const {docs, token, pluginConfig, onDuplicated} = props
  const isDarkMode = useTheme().sanity.color.dark

  // Prepare origin (this Studio) client
  const originClient = useClient(clientConfig)

  const schema = useSchema()

  // Create list of dataset options
  // and set initial value of dropdown
  const workspaces = useWorkspaces()
  const workspacesOptions: WorkspaceOption[] = workspaces.map((workspace) => ({
    ...workspace,
    disabled:
      workspace.dataset === originClient.config().dataset &&
      workspace.projectId === originClient.config().projectId,
  }))

  const [destination, setDestination] = useState<WorkspaceOption | null>(
    workspaces.length ? workspacesOptions.find((space) => !space.disabled) ?? null : null
  )
  const [message, setMessage] = useState<Message | null>(null)
  const [payload, setPayload] = useState<PayloadItem[]>([])

  const [hasReferences, setHasReferences] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [isGathering, setIsGathering] = useState(false)
  const [progress, setProgress] = useState<number[]>([0, 0])

  // Check for References and update message
  useEffect(() => {
    const expr = `.._ref`
    const initialRefs = []
    const initialPayload: PayloadItem[] = []

    docs.forEach((doc) => {
      const refs = extractWithPath(expr, doc).map((ref) => ref.value)
      initialRefs.push(...refs)
      initialPayload.push({include: true, doc})
    })

    updatePayloadStatuses(initialPayload)

    const docCount = docs.length
    const refsCount = initialRefs.length

    if (initialRefs.length) {
      setHasReferences(true)

      setMessage({
        tone: `caution`,
        text: createInitialMessage(docCount, refsCount),
      })
    }
  }, [docs])

  // Re-check payload on destination when value changes
  // (On initial render + select change)
  useEffect(() => {
    updatePayloadStatuses()
  }, [destination])

  // Check if payload documents exist at destination
  async function updatePayloadStatuses(newPayload: PayloadItem[] = []) {
    const payloadActual = newPayload.length ? newPayload : payload

    if (!payloadActual.length || !destination?.name) {
      return
    }

    const payloadIds = payloadActual.map(({doc}) => doc._id)
    const destinationClient = originClient.withConfig({
      ...clientConfig,
      dataset: destination.dataset,
      projectId: destination.projectId,
    })
    const destinationData: SanityDocument[] = await destinationClient.fetch(
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

  function handleCheckbox(_id: string) {
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

    const payloadDocs = await getDocumentsInArray({
      fetchIds: docIds,
      client: originClient,
      pluginConfig,
    })
    const draftDocs = await getDocumentsInArray({
      fetchIds: docIds.map((id) => `drafts.${id}`),
      client: originClient,
      projection: `{_id}`,
      pluginConfig,
    })
    const draftDocsIds = new Set(draftDocs.map(({_id}) => _id))

    // Shape it up
    const payloadShaped = payloadDocs.map((doc) => ({
      doc,
      // Include this in the transaction?
      include: true,
      // Does it exist at the destination?
      status: undefined,
      // Does it have any drafts?
      hasDraft: draftDocsIds.has(`drafts.${doc._id}`),
    }))

    setPayload(payloadShaped)
    updatePayloadStatuses(payloadShaped)
    setIsGathering(false)
  }

  // Duplicate payload to destination dataset
  async function handleDuplicate() {
    if (!destination) {
      return
    }

    setIsDuplicating(true)

    const assetsCount = payload.filter(({doc, include}) => include && isAssetId(doc._id)).length
    let currentProgress = 0
    setProgress([currentProgress, assetsCount])

    setMessage({text: 'Duplicating...', tone: `transparent`})

    const destinationClient = originClient.withConfig({
      ...clientConfig,
      dataset: destination.dataset,
      projectId: destination.projectId,
    })

    const transactionDocs: SanityDocument[] = []
    const svgMaps: {old: string; new: string}[] = []

    // Upload assets and then add to transaction
    async function fetchDoc(doc: SanityAssetDocument) {
      if (isAssetId(doc._id)) {
        // Download and upload asset
        // Get the *original* image with this dlRaw param to create the same deterministic _id
        const typeIsFile = isSanityFileAsset(doc)
        const downloadUrl = typeIsFile ? doc.url : `${doc.url}?dlRaw=true`
        const downloadConfig = typeIsFile ? {} : {headers: {Authorization: `Bearer ${token}`}}

        await fetch(downloadUrl, downloadConfig).then(async (res) => {
          const assetData = await res.blob()

          const options = {filename: doc.originalFilename}
          const assetDoc = await destinationClient.assets.upload(
            typeIsFile ? `file` : `image`,
            assetData,
            options
          )

          // SVG _id's need remapping before transaction
          if (doc?.extension === 'svg') {
            svgMaps.push({old: doc._id, new: assetDoc._id})
          }

          // This adds the newly created asset document to the transaction but ...
          // it doesn't have some of the original asset's metadata like `altText` or `title`
          transactionDocs.push(assetDoc)

          // So the original `doc` is added to the transaction as well below
          // However, we don't want to retain `url` or `path` keys
          // because these strings contain the origin's dataset name
          doc.url = assetDoc.url
          doc.path = assetDoc.path
        })

        currentProgress += 1
        setMessage({
          text: `Duplicating ${currentProgress}/${assetsCount} ${
            assetsCount === 1 ? `Assets` : `Assets`
          }`,
          tone: 'default',
        })

        setProgress([currentProgress, assetsCount])
      }

      return transactionDocs.push(doc)
    }

    // Promises are limited to three at once
    const result = new Promise((resolve, reject) => {
      const payloadIncludedDocs = payload.filter((item) => item.include).map((item) => item.doc)

      mapLimit(payloadIncludedDocs, 3, asyncify(fetchDoc), (err: Error) => {
        if (err) {
          setIsDuplicating(false)
          setMessage({tone: 'critical', text: `Duplication Failed`})
          console.error(err)
          reject(new Error('Duplication Failed'))
        }

        // @ts-ignore
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
    setProgress([0, 0])
    if (onDuplicated) {
      try {
        await onDuplicated()
      } catch (error) {
        setMessage({tone: 'critical', text: `Error in onDuplicated hook: ${error}`})
      }
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (!workspacesOptions.length) {
      return
    }

    const targeted = workspacesOptions.find((space) => space.name === e.currentTarget.value)

    if (targeted) {
      setDestination(targeted)
    }
  }

  const payloadCount = payload.length
  const firstSvgIndex = payload.findIndex(({doc}) => doc.extension === 'svg')
  const selectedDocumentsCount = payload.filter(
    (item) => item.include && !isAssetId(item.doc._id)
  ).length
  const selectedAssetsCount = payload.filter(
    (item) => item.include && isAssetId(item.doc._id)
  ).length
  const selectedTotal = selectedDocumentsCount + selectedAssetsCount
  const destinationTitle = destination?.title ?? destination?.name
  const hasMultipleProjectIds =
    new Set(workspacesOptions.map((space) => space?.projectId).filter(Boolean)).size > 1

  const headingText = [selectedTotal, `/`, payloadCount, `Documents and Assets selected`].join(` `)

  const buttonText = React.useMemo(() => {
    const text = [`Duplicate`]

    if (selectedDocumentsCount > 1) {
      text.push(
        String(selectedDocumentsCount),
        selectedDocumentsCount === 1 ? `Document` : `Documents`
      )
    }

    if (selectedAssetsCount > 1) {
      text.push(`and`, String(selectedAssetsCount), selectedAssetsCount === 1 ? `Asset` : `Assets`)
    }

    if (originClient.config().projectId !== destination?.projectId) {
      text.push(`between Projects`)
    }

    text.push(`to`, String(destinationTitle))

    return text.join(` `)
  }, [
    selectedDocumentsCount,
    selectedAssetsCount,
    originClient,
    destination?.projectId,
    destinationTitle,
  ])

  if (workspacesOptions.length < 2) {
    return (
      <Feedback tone="critical">
        <code>sanity.config.ts</code> must contain at least two Workspaces to use this plugin.
      </Feedback>
    )
  }

  return (
    <Container width={1}>
      <Card border>
        <Stack>
          <Card padding={4} style={stickyStyles(isDarkMode)}>
            <Stack space={4}>
              <Flex gap={3}>
                <Stack style={{flex: 1}} space={3}>
                  <Label>Duplicate from</Label>
                  <Select readOnly value={workspacesOptions.find((space) => space.disabled)?.name}>
                    {workspacesOptions
                      .filter((space) => space.disabled)
                      .map((space) => (
                        <option key={space.name} value={space.name} disabled={space.disabled}>
                          {space.title ?? space.name}
                          {hasMultipleProjectIds ? ` (${space.projectId})` : ``}
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
                    {workspacesOptions.map((space) => (
                      <option key={space.name} value={space.name} disabled={space.disabled}>
                        {space.title ?? space.name}
                        {hasMultipleProjectIds ? ` (${space.projectId})` : ``}
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
          <Card borderTop padding={4}>
            <Stack space={3}>
              {message && (
                <Card padding={3} radius={2} shadow={1} tone={message.tone}>
                  <Text size={1}>{message.text}</Text>
                </Card>
              )}
              {payload.length > 0 ? (
                <Stack>
                  {payload.map(({doc, include, status, hasDraft}, index) => {
                    const schemaType = schema.get(doc._type)

                    return (
                      <React.Fragment key={doc._id}>
                        <Flex align="center">
                          <Checkbox checked={include} onChange={() => handleCheckbox(doc._id)} />
                          <Box flex={1} paddingX={3}>
                            {schemaType ? (
                              <Preview value={doc} schemaType={schemaType} />
                            ) : (
                              <Card tone="caution">Invalid schema type</Card>
                            )}
                          </Box>
                          <Flex align="center" gap={2}>
                            {hasDraft ? <StatusBadge status="UNPUBLISHED" isAsset={false} /> : null}
                            <StatusBadge status={status} isAsset={isAssetId(doc._id)} />
                          </Flex>
                        </Flex>
                        {doc?.extension === 'svg' && index === firstSvgIndex && (
                          <Card padding={3} radius={2} shadow={1} tone="caution">
                            <Text size={1}>
                              Due to how SVGs are sanitized after first uploaded, duplicated SVG
                              assets may have new <code>_id</code>'s at the destination. The newly
                              generated <code>_id</code> will be the same in each duplication, but
                              it will never be the same <code>_id</code> as the first time this
                              Asset was uploaded. References to the asset will be updated to use the
                              new <code>_id</code>.
                            </Text>
                          </Card>
                        )}
                      </React.Fragment>
                    )
                  })}
                </Stack>
              ) : (
                <Flex padding={4} align="center" justify="center">
                  <Spinner />
                </Flex>
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
                    disabled={isDuplicating || !selectedTotal || isGathering}
                  />
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
            </Stack>
          </Card>
        </Stack>
      </Card>
    </Container>
  )
}
