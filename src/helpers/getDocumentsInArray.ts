import {extract} from '@sanity/mutator'
import {SanityDocument} from '../types'

// Recursively fetch Documents from an array of _id's and their references
// Heavy use of Set is to avoid recursively querying for id's already in the payload
export async function getDocumentsInArray(
  fetchIds: string[],
  client: any,
  currentIds?: Set<string>,
  projection?: string,
) {
  const collection = []

  // Find initial docs
  const query = `*[_id in $fetchIds]${projection ?? ``}`
  const data: SanityDocument[] = await client.fetch(query, {
    fetchIds: fetchIds ?? [],
  })

  if (!data?.length) {
    return []
  }

  const localCurrentIds = currentIds ?? new Set()
  
  // Find new ids in the returned data
  // Unless we started with an empty set, get the _ids from the data
  const newDataIds: Set<string> = new Set(
    data
      .map((dataDoc) => dataDoc._id)
      .filter((id) => (currentIds?.size ? !localCurrentIds.has(id) : Boolean(id)))
  )

  if (newDataIds.size) {
    collection.push(...data)
    localCurrentIds.add(...newDataIds)

    // Check new data for more references
    await Promise.all(
      data.map(async (doc) => {
        const expr = `.._ref`
        const references = extract(expr, doc)

        if (references.length) {
          // Find references not already in the Collection
          const newReferenceIds = new Set(references.filter((refId) => !localCurrentIds.has(refId)))

          if (newReferenceIds.size) {
            // Recusive query for new documents
            const referenceDocs = await getDocumentsInArray(
              Array.from(newReferenceIds),
              client,
              localCurrentIds
            )

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
  const uniqueCollection = collection.filter(Boolean).reduce((acc, cur) => {
    if (acc.some((doc) => doc._id === cur._id)) {
      return acc
    }

    return [...acc, cur]
  }, []) 

  return uniqueCollection
}
