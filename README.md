[![License](https://img.shields.io/npm/l/ts-expose-internals)](https://opensource.org/licenses/MIT)

# TypeScript Internal Types

Expose TypeScript internal types by simply adding a development dependency.

## Setup

1. Add aliased dependency to package.json (use the same version as your typescript version)

   ```jsonc
   {
     "devDependencies": {
       "typescript": "^5.1.3",
       // Note: The package is 'ts-expose-internals', but we are aliasing within the @types scope to make TS adopt it globally
       "@types/ts-expose-internals": "npm:ts-expose-internals@5.1.3"
     }
   }
   ```

2. Run `npm install` / `yarn install`

## Usage
All internal types are now available within the primary typescript module
```ts
// This namespace is flagged @internal and is omitted from published types, but now we can access it!
import { JsDoc } from 'typescript'
```

## How It Works

The code within this repo runs on a schedule every day via GitHub Actions.

It checks for new TypeScript release tags, and if there are any, it clones the source code for that release and
builds the internal types. After, it performs a bit of transformation magic and publishes the package to NPM.

New types are added to the 'typescript' module via the 
[Module Augmentation](https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation) technique.

## Notes

- We publish for full TS releases only. If you'd like nightly builds, have a look at [byots](https://github.com/basarat/byots).
- If we don't have a package for the latest release, please allow 24hrs, then file an issue.

## Acknowledgments

Thanks to [basarat](https://github.com/basarat) for his work on [byots](https://github.com/basarat/byots), which served
as the inspiration!
