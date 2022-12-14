# Cross Dataset Duplicator (for Sanity Studio v2)

> This is the Sanity Studio v2 version of the plugin. For the Sanity Studio v3 version, see [@sanity/cross-dataset-duplicator](https://github.com/sanity-io/cross-dataset-duplicator)

Sanity Studio Tool and Document Action for empowering content editors to migrate Documents and Assets between Sanity Datasets and Projects from inside the Studio.

## Install

From the root directory of your studio

```
sanity install @sanity/cross-dataset-duplicator
```

### Important Notes

This plugin is designed as a convenience for Authors to make small, infrequent content migrations between Datasets.

- This plugin should be used in conjunction with a reliable backup strategy.
- Proceed with caution as this plugin can instantly write changes to Datasets.
- Larger migrations may take more time, especially with Assets. The plugin tries to mitigate this with rate limiting asset uploads to 3 at a time.
- If an Asset is already present at the destination, there's no need to duplicate it again.
- Before starting a Duplication you can select which Documents and Assets to include. Migrations will fail if every Referenced Document or Asset is not included in the transaction or already present at the destination Dataset.

## Tool

The **Duplicate** Tool allows you to migrate Documents that are returned from any GROQ query.

![2022-04-04 13 23 57](https://user-images.githubusercontent.com/9684022/161548068-80f2552a-3cb6-47fb-ac13-b4e24a98bd05.gif)

## Document Action

The **Duplicate to...** Document Action allows you to migrate an individual Document.

![2022-04-04 13 52 14](https://user-images.githubusercontent.com/9684022/161548033-216f5de1-5617-4f2c-a201-3ab9efbf0803.gif)

**Note:** If your Studio registered its own Document Actions, the plugin config will be overruled. See "Importing the Document Action" below.

## Required Setup

### 1. Spaces

You must have [Spaces configured](https://www.sanity.io/docs/spaces) to use this plugin. Spaces are still listed as an experimental feature but have been supported for some time.

All Datasets setup in Spaces will become selectable "destinations" for Migrations.

Once setup, you will see a dropdown menu next to the Search bar in the Studio with the Datasets you have configured in Spaces.

### 2. Configuration

The plugin has some configuration options. These can be set by adding a config file to your Studio

```js
// ./config/@sanity/cross-dataset-duplicator.json
```

```json
{
  "tool": true,
  "types": ["article", "page"],
  "filter": "_type != 'product'",
  "follow" []
}
```

Options:

- `tool` (boolean, default: true) – Set whether the Migration Tool is enabled.
- `types` (Array[String], default: []) – Set which Schema Types the Migration Action should be enabled in.
- `filter` (String, default: undefined) - Set a predicate for documents when gathering dependencies.
- `follow` (("inbound" | "outbound")[], default: []) – Add buttons to allow the user to begin with just the existing document or first fetch all inbound references.

### 3. Authentication Key

To Duplicate the original files of Assets, an API Token with Viewer permissions is required. You will be prompted for this the first time you attempt to use either the Tool or Document Action on any Dataset.

This plugin uses [Sanity Secrets](https://github.com/sanity-io/sanity-studio-secrets/) to store the token in the Dataset itself.

You can [create API tokens in manage](https://sanity.io/manage)

### 4. CORS origins

If you want to duplicate data across different projects, you need to enable CORS for the different hosts. This allows different projects to connect to each other through the project API. CORS origins configuration can be found in your project page, under the API tab.

## Importing the Document Action

In your Studio's `sanity.json` file, look for the `document-actions/resolver` part, it will look like this:

```json
{
  "implements": "part:@sanity/base/document-actions/resolver",
  "path": "./src/document-actions"
}
```

Now update your Studio's Document Actions resolver to be something like this

```js
import defaultResolve from 'part:@sanity/base/document-actions'
import {DuplicateToAction} from '@sanity/cross-dataset-duplicator'
import config from 'config:@sanity/cross-dataset-duplicator'

export default function resolveDocumentActions(props) {
  const defaultActions = defaultResolve(props)

  // This will look through the "types" array in your migration.json config file
  // If the type of this document is found in that array, the Migrate Action will show
  if (config?.types?.length && config.types.includes(props.type)) {
    return [...defaultActions, DuplicateToAction]
  }

  // ...all your other document action code

  return defaultActions
}
```

## Future feature ideas

- Save predefined GROQ queries in the Tool to make bulk repeated Migrations simpler
- Config options for allowed migrations (eg Dev -> Staging but not Dev -> Live)
- Config options for permissions/user role checks
