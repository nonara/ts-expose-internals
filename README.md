[![License](https://img.shields.io/npm/l/ts-expose-internals)](https://opensource.org/licenses/MIT)

# TypeScript Internal Types

Expose TypeScript internal types by simply adding a development dependency.

## Setup

1. Add dependency to package.json (set version to the same as your typescript version)

   ```jsonc
   {
     "devDependencies": {
       "typescript": "^3.9.6",
       "ts-expose-internals": "^3.9.6"
     }
   }
   ```

2. Run `npm install` / `yarn install`

3. Add the following line to your main index.ts

   ```ts 
   import {} from 'ts-expose-internals'
   ```

    _Notes:_
    
    - This line only needs to be added to one source file (it doesn't have to be main index), and the types will be 
      recognized project-wide
    - We include the empty `{} from` in order to make sure it does not get output in compiled source
    - You might need to tell your linter to ignore the import line if it's set to flag empty imports

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

Thanks to [bararat](https://github.com/basarat) for his work on [byots](https://github.com/basarat/byots), which served
as the inspiration!
