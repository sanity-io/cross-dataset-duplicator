export function typeIsAsset(type = ``) {
  if (!type) return false

  return ['sanity.imageAsset', 'sanity.fileAsset'].includes(type)
}
