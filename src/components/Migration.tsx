import React, {useEffect, useState} from 'react'
import {useSecrets, SettingsView} from 'sanity-secrets'
import {ThemeProvider, Flex, Box, Spinner} from '@sanity/ui'

import MigrationQuery from './MigrationQuery'
import MigrationTool from './MigrationTool'
import ResetSecret from './ResetSecret'
import Feedback from './Feedback'
import {SanityDocument} from '../types'

// Check for auth secret (required for asset uploads)
const secretNamespace = 'Migration'
const secretConfigKeys = [
  {
    key: 'bearerToken',
    title: 'An "Auth Token" is required to Migrate assets, and will be used for all Migrations. You can retrieve yours using the Sanity CLI `sanity debug --secrets`.',
    description: '',
  },
]

type MigrationProps = {
  mode: 'tool' | 'action'
  docs: SanityDocument[]
}

type Secrets = {
  bearerToken?: string
}

export default function Migration(props: MigrationProps) {
  const {mode = `tool`, docs = []} = props

  const secretsData = useSecrets(secretNamespace)
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
          namespace={secretNamespace}
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
        <MigrationQuery token={secrets?.bearerToken} />
        <ResetSecret />
      </ThemeProvider>
    )
  }

  if (!docs?.length) {
    return <Feedback>No docs passed into Migration Tool</Feedback>
  }

  return (
    <ThemeProvider>
      <MigrationTool docs={docs} token={secrets?.bearerToken} />
    </ThemeProvider>
  )
}
