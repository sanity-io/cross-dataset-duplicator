import {extractWithPath} from '@sanity/mutator'
import {SanityClient, SanityDocument} from 'sanity'
import {PluginConfig} from '../types'

type OptionsBag = {
  fetchIds: string[]
  client: SanityClient
  pluginConfig: PluginConfig
  currentIds?: Set<string> | null
  projection?: string
}

const isAsset = (doc: SanityDocument) =>
  doc._type === 'sanity.imageAsset' || doc._type === 'sanity.fileAsset'

const returnOnlyAssets = (references: SanityDocument[]) =>
  references.filter((item) => isAsset(item))

// Recursively fetch Documents from an array of _id's and their references
// Heavy use of Set is to avoid recursively querying for id's already in the payload

export async function getDocumentsInArray(
  options: OptionsBag,
  recurrsionDepth: number = 0
): Promise<SanityDocument[]> {
  const {fetchIds, client, pluginConfig, currentIds, projection} = options
  const {referenceMaxDepth, referenceMaxDepthAssetsOnly} = pluginConfig
  const collection: SanityDocument[] = []

  // Find initial docs
  const filter = ['_id in $fetchIds', pluginConfig.filter].filter(Boolean).join(' && ')
  const query = `*[${filter}]${projection ?? ``}`
  const data: SanityDocument[] = await client.fetch(query, {
    fetchIds: fetchIds ?? [],
  })

  if (!data?.length) {
    return []
  }

  const localCurrentIds = currentIds ?? new Set<string>()

  // Find new ids in the returned data
  // Unless we started with an empty set, get the _ids from the data
  const newDataIds = new Set<string>(
    data
      .map((dataDoc) => dataDoc._id)
      .filter((id) => (currentIds?.size ? !localCurrentIds.has(id) : Boolean(id)))
  )

  if (newDataIds.size) {
    collection.push(...data)
    // @ts-ignore
    localCurrentIds.add(...newDataIds)

    // Check new data for more references
    await Promise.all(
      data.map(async (doc) => {
        const expr = `.._ref`
        const references: string[] = extractWithPath(expr, doc).map((ref) => ref.value as string)

        if (references.length) {
          // Find references not already in the Collection
          const newReferenceIds = new Set<string>(
            references.filter((ref) => !localCurrentIds.has(ref))
          )

          if (newReferenceIds.size) {
            // Recursive query for new documents

            // If the referenceMaxDepth is set, enter here for recursion and the option to only return assets
            if (typeof referenceMaxDepth === 'number' && referenceMaxDepth >= 0) {
              recurrsionDepth++

              const referenceDocs = await getDocumentsInArray(
                {
                  fetchIds: Array.from(newReferenceIds),
                  currentIds: localCurrentIds,
                  client,
                  pluginConfig,
                },
                recurrsionDepth
              )

              // I know this is a bit messy... but I hit the max nesting eslint limit
              if (
                // // If we are at the max depth and referenceMaxDepthAssetsOnly is falsy
                referenceDocs?.length &&
                recurrsionDepth === referenceMaxDepth + 1 &&
                !referenceMaxDepthAssetsOnly
              ) {
                collection.push(...referenceDocs)
              } else if (
                // // If we are at the max depth and referenceMaxDepthAssetsOnly is truthy
                referenceDocs?.length &&
                recurrsionDepth === referenceMaxDepth + 1 &&
                referenceMaxDepthAssetsOnly
              ) {
                collection.push(...returnOnlyAssets(referenceDocs))
              } else if (referenceDocs?.length && recurrsionDepth < referenceMaxDepth + 1) {
                // // If we are not at the max depth
                collection.push(...referenceDocs)
              }
            } else {
              const referenceDocs = await getDocumentsInArray({
                fetchIds: Array.from(newReferenceIds),
                currentIds: localCurrentIds,
                client,
                pluginConfig,
              })

              if (referenceDocs?.length) {
                collection.push(...referenceDocs)
              }
            }
          }
        }
      })
    )
  }

  // Create a unique array of objects from collection
  // Set() wasn't working for unique id's ¯\_(ツ)_/¯
  const uniqueCollection = collection.filter(Boolean).reduce((acc: SanityDocument[], cur) => {
    if (acc.some((doc) => doc._id === cur._id)) {
      return acc
    }

    return [...acc, cur]
  }, [])

  return uniqueCollection
}
