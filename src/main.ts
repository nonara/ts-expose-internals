import { createContext } from './context';
import { getApplicableTsTags } from './ts-tags';
import { withTmpDir } from './utils/tmp-dir';
import { buildTsDeclarations } from './ts-declarations';
import { BuildDetail } from './storage';
import { publish } from './publish';
import { execCmd } from './utils/exec';


/* ****************************************************************************************************************** */
// region: Utils
/* ****************************************************************************************************************** */

export function run(isDryRun: boolean = false) {
  const baseContext = createContext();
  const { storage } = baseContext;

  baseContext.dryRun = isDryRun;

  const tags = getApplicableTsTags(baseContext);
  if (!tags.length) {
    console.log('No new versions to build!');
    return;
  }

  withTmpDir('build', (buildDir) => {
    /* Prepare */
    const { tsRepoUrl } = storage.settings;

    /* Build */
    let encounteredErrors = false;
    let updatedBuilds: BuildDetail[] = [];
    for (const tag of tags) {
      const context = { ...baseContext };

      /* Find or create build detail */
      let buildDetail = storage.buildDetails.find(bd => bd.tag === tag);
      if (!buildDetail) {
        buildDetail = {
          tag,
          tsVersion: <never>undefined,
          attempts: 1,
          complete: false,
          lastAttempt: Date.now(),
        };
        storage.buildDetails.push(buildDetail);
      } else {
        if (buildDetail.complete) throw new Error(`Build already complete for ${tag}! Should be unreachable.`);

        if (buildDetail.attempts >= storage.settings.maxAttempts) continue;

        buildDetail.attempts++;
        buildDetail.lastAttempt = Date.now();
      }

      try {
        /* Build Declarations */
        const { dtsContent, tsVersion } = buildTsDeclarations(tsRepoUrl, tag, buildDir, true);

        /* Publish new version */
        buildDetail.tsVersion = tsVersion;
        context.currentBuild = { buildDetail, dtsContent };
        publish(context);

        /* Update build detail */
        buildDetail.complete = true;
      } catch (err) {
        encounteredErrors = true;
        console.error(`Error: [${tag}] ${err}`);
        buildDetail.complete = false;
      } finally {
        updatedBuilds.push(buildDetail);
      }
    }

    /* Complete */
    if (updatedBuilds.length) {
      console.log(`Updating storage with ${updatedBuilds.length} new builds...`);
      storage.save(isDryRun);

      if (!isDryRun) execCmd(`git push`, { env: { ...process.env }, cwd: baseContext.repoRootDir });
    }

    if (encounteredErrors) throw new Error(`Finished with errors — see log`);
  });
}

// endregion


/* ****************************************************************************************************************** *
 * Entry
 * ****************************************************************************************************************** */

if (require.main === module) {
  const isDryRun = process.env.DRY_RUN === 'true' || process.argv.includes('--dry-run');
  run(isDryRun);
}
