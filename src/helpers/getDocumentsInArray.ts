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

// Recursively fetch Documents from an array of _id's and their references
// Heavy use of Set is to avoid recursively querying for id's already in the payload
export async function getDocumentsInArray(options: OptionsBag): Promise<SanityDocument[]> {
  const {fetchIds, client, pluginConfig, currentIds, projection} = options
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
