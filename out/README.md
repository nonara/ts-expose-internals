[![License](https://img.shields.io/npm/l/ts-expose-internals)](https://opensource.org/licenses/MIT)

# TypeScript Internal Types

Expose TypeScript internal types by simply adding a development dependency.

## Setup

1. Add aliased dependency to package.json (use the same version as your typescript version)

   ```jsonc
   {
     "devDependencies": {
       "typescript": "^3.9.6",
       // Note: The package is 'ts-expose-internals', but we are aliasing within the @types scope to make TS adopt it globally
       "@types/ts-expose-internals": "npm:ts-expose-internals@3.9.6"
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

## How it works

This repository is deployed on a server which runs `scripts/cron.sh` every 12 hours.

The scripts compare our release tags with the TypeScript compiler's tags. If new versions are detected,
it builds the compiler source, with internal types included, and publishes a new release with its types.

New types are added to the 'typescript' module via the 
[Module Augmentation](https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation) technique.

## Notes

- We publish for TS releases only. If you'd like nightly builds, have a look at [byots](https://github.com/basarat/byots).
- If we don't have a package for the latest release, please allow 24hrs, then file an issue.

## Acknowledgments

Thanks to [basarat](https://github.com/basarat) for his work on [byots](https://github.com/basarat/byots), which served
as the inspiration!
