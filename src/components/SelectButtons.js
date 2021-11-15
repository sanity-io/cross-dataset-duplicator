import React, {useState, useEffect} from 'react'
import PropTypes from 'prop-types'
import {Button, Card, Inline} from '@sanity/ui'
import {typeIsAsset} from '../helpers'

const buttons = [`All`, `None`, `New`, `Updated`, `Assets`, `Documents`]
const buttonProps = {fontSize: 1, mode: 'bleed', padding: 2}

export default function SelectButtons({payload, setPayload}) {
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
        newPayload.map((item) => (item.include = Boolean(item.status !== 'EXISTS')))
        break
      case 'UPDATED':
        newPayload.map((item) => (item.include = Boolean(item.status === 'EXISTS')))
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
      <Inline space={1}>
        {buttons.map((action) => (
          <Button
            key={action}
            {...buttonProps}
            text={action}
            disabled={disabledActions.includes(action.toUpperCase())}
            onClick={() => handleSelectButton(action.toUpperCase())}
          />
        ))}
      </Inline>
    </Card>
  )
}

SelectButtons.propTypes = {
  payload: PropTypes.array.isRequired,
  setPayload: PropTypes.func.isRequired,
}
