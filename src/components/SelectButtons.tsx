import {useState, useEffect} from 'react'
import {Button, Card, Flex} from '@sanity/ui'

import {PayloadItem} from './Duplicator'
import {isAssetId} from '@sanity/asset-utils'

const buttons = [
  `All`,
  `None`,
  null,
  `New`,
  `Existing`,
  `Updated`,
  `Older`,
  null,
  `Documents`,
  `Assets`,
]

type Action = 'ALL' | 'NONE' | 'NEW' | 'EXISTING' | 'UPDATED' | 'OLDER' | 'ASSETS' | 'DOCUMENTS'

type SelectButtonsProps = {
  payload: PayloadItem[]
  setPayload: Function
}

export default function SelectButtons(props: SelectButtonsProps) {
  const {payload, setPayload} = props
  const [disabledActions, setDisabledActions] = useState<Action[]>([])

  // Set intiial disabled button
  useEffect(() => {
    if (!disabledActions?.length && payload.every((item) => item.include)) {
      setDisabledActions([`ALL`])
    }
  }, [disabledActions?.length, payload])

  function handleSelectButton(action?: Action) {
    if (!action || !payload.length) return

    const newPayload = [...payload]

    switch (action) {
      case 'ALL':
        newPayload.map((item) => (item.include = true))
        break
      case 'NONE':
        newPayload.map((item) => (item.include = false))
        break
      case 'NEW':
        newPayload.map((item) => (item.include = Boolean(item.status === 'CREATE')))
        break
      case 'EXISTING':
        newPayload.map((item) => (item.include = Boolean(item.status === 'EXISTS')))
        break
      case 'UPDATED':
        newPayload.map(
          (item) => (item.include = Boolean(item.status === 'UPDATE' && !isAssetId(item.doc._id)))
        ) // Exclude assets from this list, because 'UPDATE' state is mapped to 'RE-UPLOAD' action in UI
        break
      case 'OLDER':
        newPayload.map((item) => (item.include = Boolean(item.status === 'OVERWRITE')))
        break
      case 'ASSETS':
        newPayload.map((item) => (item.include = isAssetId(item.doc._id)))
        break
      case 'DOCUMENTS':
        newPayload.map((item) => (item.include = !isAssetId(item.doc._id)))
        break
      default:
        break
    }

    setDisabledActions([action])
    setPayload(newPayload)
  }

  return (
    <Card padding={1} radius={3} shadow={1}>
      <Flex gap={2} wrap="wrap">
        {buttons.map((action, actionIndex) =>
          action ? (
            <Button
              key={action}
              fontSize={1}
              mode="bleed"
              padding={2}
              text={action}
              disabled={disabledActions.includes(action.toUpperCase() as Action)}
              onClick={() => handleSelectButton(action.toUpperCase() as Action)}
            />
          ) : (
            // eslint-disable-next-line react/no-array-index-key
            <Card key={`divider-${actionIndex}`} borderLeft />
          )
        )}
      </Flex>
    </Card>
  )
}
