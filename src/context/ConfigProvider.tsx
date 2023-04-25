import {useContext} from 'react'
import {createContext} from 'react'
import {LayoutProps} from 'sanity'

import {DEFAULT_CONFIG} from '../helpers/constants'
import {PluginConfig} from '../types'

const CrossDatasetDuplicatorContext = createContext(DEFAULT_CONFIG)

type ConfigProviderProps = LayoutProps & {pluginConfig: PluginConfig}

/**
 * Plugin config context hook from the Cross Dataset Duplicator plugin
 * @public
 */
export function useCrossDatasetDuplicatorConfig() {
  const pluginConfig = useContext(CrossDatasetDuplicatorContext)

  return pluginConfig
}

export function ConfigProvider(props: ConfigProviderProps) {
  const {pluginConfig, ...rest} = props

  return (
    <CrossDatasetDuplicatorContext.Provider value={pluginConfig}>
      {props.renderDefault(rest)}
    </CrossDatasetDuplicatorContext.Provider>
  )
}
