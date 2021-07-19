import React, {useEffect, useState} from 'react'
import PropTypes from 'prop-types'
import {useSecrets, SettingsView} from 'sanity-secrets'
import {Flex, Box, Spinner} from '@sanity/ui'

import MigrationQuery from './MigrationQuery'
import MigrationTool from './MigrationTool'

// Check for auth secret (required for asset uploads)
const secretNamespace = 'Migration'
const secretConfigKeys = [
  {
    key: 'bearerToken',
    title: 'An Auth Token for this studio. Get yours with `sanity debug --secrets`',
  },
]

export default function Migration({mode, docs}) {
  const {loading, secrets} = useSecrets(secretNamespace)
  const [showSecretsPrompt, setShowSecretsPrompt] = useState(false)

  useEffect(() => {
    setShowSecretsPrompt(!secrets?.bearerToken)
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

  if (!loading && showSecretsPrompt) {
    return (
      <SettingsView
        namespace={secretNamespace}
        keys={secretConfigKeys}
        // eslint-disable-next-line react/jsx-no-bind
        onClose={() => setShowSecretsPrompt(false)}
      />
    )
  }

  if (mode === 'tool') {
    return <MigrationQuery token={secrets.bearerToken} />
  }

  if (!docs.length) {
    return <div>No docs passed into Migration Tool</div>
  }

  return <MigrationTool docs={docs} token={secrets.bearerToken} />
}

Migration.propTypes = {
  docs: PropTypes.arrayOf(PropTypes.shape({_id: PropTypes.string})),
  mode: PropTypes.string,
}

Migration.defaultProps = {
  docs: [],
  mode: 'tool',
}
