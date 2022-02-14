import React, {useState, useEffect} from 'react'
import {Button, Card, Flex} from '@sanity/ui'
import {typeIsAsset} from '../helpers'
import {PayloadItem} from '../types'

const buttons = [`All`, `None`, null, `New`, `Existing`, `Older`, null, `Documents`, `Assets`]

type SelectButtonsProps = {
  payload: PayloadItem[]
  setPayload: Function
}

export default function SelectButtons(props: SelectButtonsProps) {
  const {payload, setPayload} = props
  const [disabledActions, setDisabledActions] = useState([])

  // Set intiial disabled button
  useEffect(() => {
    if (!disabledActions?.length && payload.every((item) => item.include)) {
      setDisabledActions([`ALL`])
    }
  }, [])

  function handleSelectButton(action = ``) {
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
      case 'OLDER':
        newPayload.map((item) => (item.include = Boolean(item.status === 'OVERWRITE')))
        break
      case 'ASSETS':
        newPayload.map((item) => (item.include = typeIsAsset(item.doc._type)))
        break
      case 'DOCUMENTS':
        newPayload.map((item) => (item.include = !typeIsAsset(item.doc._type)))
        break
      default:
        break
    }

    setDisabledActions([action])
    setPayload(newPayload)
  }

  return (
    <Card padding={1} radius={3} shadow={1}>
      <Flex gap={2}>
        {buttons.map((action, actionIndex) =>
          action ? (
            <Button
              key={action}
              fontSize={1}
              mode="bleed"
              padding={2}
              text={action}
              disabled={disabledActions.includes(action.toUpperCase())}
              onClick={() => handleSelectButton(action.toUpperCase())}
            />
          ) : (
            <Card key={`divider-${actionIndex}`} borderLeft />
          )
        )}
      </Flex>
    </Card>
  )
}
