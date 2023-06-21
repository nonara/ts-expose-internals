import * as semver from 'semver';
import { TseiContext } from './context';
import { withTmpDir } from './utils/tmp-dir';
import { execCmd } from './utils/exec';


/* ****************************************************************************************************************** */
// region: Helpers
/* ****************************************************************************************************************** */

function semverSatisfies(tag: string, range: string): boolean {
  if (tag.slice(0, 1) !== 'v') return false;

  tag = fixupVersionTag(tag);
  return semver.satisfies(tag.slice(1), range, { includePrerelease: true });
}

// endregion


/* ****************************************************************************************************************** */
// region: Utils
/* ****************************************************************************************************************** */

export function fixupVersionTag(tag: string) {
  // Fixup tags like v5.1-beta
  if (/^v\d+\.\d+-[a-zA-Z_0-9]+$/.test(tag)) {
    const versionSplit = tag.split('-');
    tag = versionSplit[0] + '.0-' + versionSplit[1];
  }

  return tag;
}

export function getAllTsTags(context: TseiContext): string[] {
  const { tsRepoUrl } = context.storage.settings;

  return withTmpDir('tags', (tsDir) => {
    /* Prepare empty repo */
    execCmd('git init', { cwd: tsDir });
    execCmd(`git remote add origin ${tsRepoUrl}`, { cwd: tsDir });

    /* Get tags */
    const rawTags = execCmd(`git ls-remote --tags ${tsRepoUrl}`, { cwd: tsDir }).toString();
    const tags = rawTags
      .split('\n')
      .map(line => line.match(/refs\/tags\/(\S+)/)?.[1])
      .filter(tag => !!tag) as string[];

    return tags;
  });
}

export function getApplicableTsTags(context: TseiContext): string[] {
  const { tsVersion } = context.storage.settings;
  const tsTags = module.exports.getAllTsTags(context) as string[];

  const tags = tsTags
    .filter(tag => semverSatisfies(tag, tsVersion)) // Matching tsVersion requirements
    .filter(tag => !context.storage.settings.skipTags.includes(tag)) // Not in skipTags
    .filter(tag => !context.storage.buildDetails.some(bd => bd.tag === tag && bd.complete)) // Not already built
    .sort((a, b) => semver.compare(fixupVersionTag(a), fixupVersionTag(b))); // Descending order

  return tags;
}

// endregion
