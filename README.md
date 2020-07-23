# ts-expose-internals

**NOTE**: This repo is not active yet. This notice will be removed when it's live

Simply include this library as a development dependency with the same version # as the typescript compiler you're using
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

The scripts in `scripts` compare local release tags with the TypeScript compiler's tags. If it detects new versions,
it compiles the source and creates a new release with the updated types.

_Note: All scripts require `/bin/sh`_

## Notes

- We publish for TS releases only. If you'd like nightly builds, I recommend [byots](https://github.com/basarat/byots).
- If our package is not matching the latest release, please allow 12hrs for sync to catch up, then file an issue