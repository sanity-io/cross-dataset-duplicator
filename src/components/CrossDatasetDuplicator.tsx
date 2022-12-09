import React, {useEffect, useState} from 'react'
import {useSecrets, SettingsView} from 'sanity-secrets'
import {Flex, Box, Spinner} from '@sanity/ui'

import DuplicatorQuery from './DuplicatorQuery'
import DuplicatorToolWrapper from './DuplicatorToolWrapper'
import ResetSecret from './ResetSecret'
import Feedback from './Feedback'
import {SECRET_NAMESPACE} from '../helpers/constants'
import {PluginConfig} from '..'
import {SanityDocument} from 'sanity'

// Check for auth secret (required for asset uploads)
const secretConfigKeys = [
  {
    key: 'bearerToken',
    title:
      'An API token with Viewer permissions is required to duplicate the original files of assets, and will be used for all Duplications. Create one at sanity.io/manage',
    description: '',
  },
]

type CrossDatasetDuplicatorProps = {
  mode: 'tool' | 'action'
  docs: SanityDocument[]
  config: PluginConfig
}

type Secrets = {
  bearerToken?: string
}

export default function CrossDatasetDuplicator(props: CrossDatasetDuplicatorProps) {
  const {mode = `tool`, docs = [], config} = props

  const {loading, secrets} = useSecrets<Secrets>(SECRET_NAMESPACE)
  const [showSecretsPrompt, setShowSecretsPrompt] = useState(false)

  useEffect(() => {
    if (secrets) {
      setShowSecretsPrompt(!secrets?.bearerToken)
    }
  }, [secrets])

  if (loading) {
    return (
      <Flex justify="center" align="center">
        <Box padding={5}>
          <Spinner />
        </Box>
      </Flex>
    )
  }

  if (!secrets) {
    return (
      <Feedback>
        Could not query for Secrets. You may have insufficient permissions on your account.
      </Feedback>
    )
  }

  if ((!loading && showSecretsPrompt) || !secrets?.bearerToken) {
    return (
      <SettingsView
        title="Token Required"
        namespace={SECRET_NAMESPACE}
        keys={secretConfigKeys}
        // eslint-disable-next-line react/jsx-no-bind
        onClose={() => setShowSecretsPrompt(false)}
      />
    )
  }

  if (mode === 'tool') {
    return (
      <>
        <DuplicatorQuery token={secrets?.bearerToken} config={config} />
        <ResetSecret />
      </>
    )
  }

  if (!docs?.length) {
    return <Feedback>No docs passed into Duplicator Tool</Feedback>
  }

  return (
    <DuplicatorToolWrapper docs={docs} token={secrets?.bearerToken} config={config} draftIds={[]} />
  )
}
