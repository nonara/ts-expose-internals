# ts-expose-internals

**NOTE**: This repo is not active yet. This notice will be removed when it's live

Simply include this library as a development dependency with the same version # as the typescript compiler you're using,
and typescript internal types will be included in `import` or `require` of the 'typescript' module.

## Example

package.json:
```jsonc
{
  "devDependencies": {
    "typescript": "^3.9.6",
    "ts-expose-internals": "^3.9.6"
  }
}
```

Usage:
```ts
// This namespace is now accessible, where it would normally not be included, as it is flagged @internal
import { JsDoc } from 'typescript'
```

## How it works

This repository is deployed on a server which runs `scripts/cron.sh` every 12 hours.

The scripts compare local release tags with the TypeScript compiler's tags. If it detects new versions,
it compiles the TS compiler source, with internal types included, and publishes a new release with the compiled types.

Declarations are automatically recognized as part of the typescript module via 
[Module Augmentation](https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation).

## Notes

- We publish for TS releases only. If you'd like nightly builds, have a look a [byots](https://github.com/basarat/byots).
- If our package is not matching the latest release, please allow 12hrs for sync to catch up, then file an issue.
- We only have types for versions 3.8 and higher, as the older builds will not compile.
  - If you'd like an older version's types and can get it to build, let us know how you've configured it, and we'll publish. 
  - Some of the older patch versions of 3.9 are missing due to the builds failing. It's advised to use latest 3.9 patch.

## Acknowledgments

Thanks to [bararat](https://github.com/basarat) for his work on [byots](https://github.com/basarat/byots), which served
as the inspiration!