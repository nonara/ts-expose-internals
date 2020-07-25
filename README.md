[![Used By](https://img.shields.io/sourcegraph/rrc/github.com/nonara/ts-expose-internals)](https://www.npmjs.com/package/ts-expose-internals)
[![License](https://img.shields.io/npm/l/ts-expose-internals)](https://opensource.org/licenses/MIT)

# TypeScript Internal Types

Expose TypeScript internal types by simply adding a development dependency.

## Setup

1. Add dependency to package.json (set version to the same as your typescript version)

        {
          "devDependencies": {
            "typescript": "^3.9.6",
            "ts-expose-internals": "^3.9.6"
          }
        }

2. Run `npm install` (for yarn: `yarn install`)

3. Import the package once in your main index.ts

        import 'ts-expose-internals'

    _Note:_
    
    _You can add this import line in any `.ts` file that is included in your project.  
    It only needs to be added once to one file in the project for the types to be recognized._

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
- We only have types for versions 3.8 and higher. The older builds will not compile. 😢
  - If you'd like an older version's types and can get it to build, let us know how you've configured it, and we'll publish it. 

## Acknowledgments

Thanks to [bararat](https://github.com/basarat) for his work on [byots](https://github.com/basarat/byots), which served
as the inspiration!