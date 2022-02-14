# Sanity Migration: Tool & Document Action

Proof of Concept for empowering content editors to migrate Documents and Assets between Sanity Datasets from inside Sanity Studio.

## Important Notes

This plugin is designed as a convenience for Authors to make small, infrequent content migrations between Datasets.

- Proceed with caution as this plugin **can instantly write changes** to Datasets.
- This plugin has gone through basic testing but may not account for all edge cases.
- Larger migrations may take more time, especially with Assets. The plugin tries to mitigate this with rate limiting asset uploads to 3 at a time.
- Before starting a Migration you can select which Documents and Assets to include. Keep in mind Migrations will likely fail if every Referenced Document or Asset is not already present at the destination Dataset.
  -- Both methods can gather References –- and do a recursive search for References of References –- so the Migration has every Document and Asset it needs to complete.

## Tool

The Migration Tool allows you to migrate Documents that are returned from any GROQ query.

![2021-07-19 15 35 19](https://user-images.githubusercontent.com/9684022/126177728-67ba3789-3467-4fa3-b645-508402546767.gif)

## Document Action

The Migration Document Action allows you to migrate an individual Document.

![2021-07-19 15 34 21](https://user-images.githubusercontent.com/9684022/126177655-05074748-6212-4ff1-aa1f-67a535c02101.gif)

**Note:** If your Studio registered its own Document Actions, the plugin config will be overruled. See "Importing the Document Action" below.

## Required Setup

### 1. Spaces

You must have [Spaces configured](https://www.sanity.io/docs/spaces) to use this plugin. Spaces are still listed as an experimental feature but have been supported for some time.

All Datasets setup in Spaces will become selectable "destinations" for Migrations. This means you can have additional datasets in the project that cannot be Migrated to.

Once setup, you will see a dropdown menu next to the Search bar in the Studio with the Datasets you have configured in Spaces.

### 2. Configuration

The plugin has some configuration options. These can be set by adding a config file to your studio at `./config/migration.json`.

For example:

```json
{
  "tool": true,
  "types": ["article", "page"]
}
```

Options:

- `tool` (boolean, default: true) – Set whether the Migration Tool is enabled.
- `types` (Array[String], default: []) – Set which Schema Types the Migration Action should be enabled in.

### 3. Authentication Key

To Migrate Assets between Datasets an additional Authentication Token is required. You will be prompted for this the first time you attempt to use either the Tool or Document Action on any Dataset.

This plugin uses [Sanity Secrets](https://github.com/sanity-io/sanity-studio-secrets/) to store the token in the Dataset itself.

You can reveal the token belonging to your user account with `sanity debug --secrets`

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
import {MigrateAction} from 'sanity-plugin-migration'
import migrationConfig from 'config:migration'

export default function resolveDocumentActions(props) {
  const defaultActions = defaultResolve(props)

  // This will look through the "types" array in your migration.json config file
  // If the type of this document is found in that array, the Migrate Action will show
  if (migrationConfig?.types?.length && migrationConfig.types.includes(props.type)) {
    return [...defaultActions, MigrateAction]
  }

  // ...all your other document action code

  return defaultActions
}
```

## Roadmap

🔜 Save predefined GROQ queries in the Tool to make bulk repeated Migrations simpler
✅ More UI affordances eg "Only Migrate New", "Only Migrate Documents", etc.
🔜 Config options for allowed migrations (eg Dev -> Staging but not Dev -> Live)
🔜 Config options for permissions/user role checks
