import React, {useEffect, useState} from 'react'
import {useSecrets, SettingsView} from 'sanity-secrets'
import {ThemeProvider, Flex, Box, Spinner} from '@sanity/ui'

import DuplicatorQuery from './DuplicatorQuery'
import {DuplicatorToolWrapper} from './DuplicatorTool'
import ResetSecret from './ResetSecret'
import Feedback from './Feedback'
import {SanityDocument} from '../types'
import {SECRET_NAMESPACE} from '../helpers/constants'

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
}

type Secrets = {
  bearerToken?: string
}

export default function CrossDatasetDuplicator(props: CrossDatasetDuplicatorProps) {
  const {mode = `tool`, docs = []} = props

  const secretsData = useSecrets(SECRET_NAMESPACE)
  const {loading, secrets}: {loading: boolean; secrets: Secrets} = secretsData
  const [showSecretsPrompt, setShowSecretsPrompt] = useState(false)

  useEffect(() => {
    if (secrets) {
      setShowSecretsPrompt(!secrets?.bearerToken)
    }
  }, [secrets])

  if (!secretsData) {
    return (
      <Feedback>
        Could not query for Secrets. You may have insufficient permissions on your account.
      </Feedback>
    )
  }

  if (loading) {
    return (
      <ThemeProvider>
        <Flex justify="center" align="center">
          <Box padding={5}>
            <Spinner />
          </Box>
        </Flex>
      </ThemeProvider>
    )
  }

  if ((!loading && showSecretsPrompt) || !secrets?.bearerToken) {
    return (
      <ThemeProvider>
        <SettingsView
          title="Token Required"
          namespace={SECRET_NAMESPACE}
          keys={secretConfigKeys}
          // eslint-disable-next-line react/jsx-no-bind
          onClose={() => setShowSecretsPrompt(false)}
        />
      </ThemeProvider>
    )
  }

  if (mode === 'tool') {
    return (
      <ThemeProvider>
        <DuplicatorQuery token={secrets?.bearerToken} />
        <ResetSecret />
      </ThemeProvider>
    )
  }

  if (!docs?.length) {
    return (
      <ThemeProvider>
        <Feedback>No docs passed into Duplicator Tool</Feedback>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <DuplicatorToolWrapper docs={docs} token={secrets?.bearerToken} />
    </ThemeProvider>
  )
}
