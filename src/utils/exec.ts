import { execSync } from 'child_process';
import { isDebugMode } from '../config';


/* ****************************************************************************************************************** */
// region: Locals
/* ****************************************************************************************************************** */

const stdio = isDebugMode ? [ 'pipe', 'pipe', 'inherit' ]  : 'pipe';

// endregion


/* ****************************************************************************************************************** */
// region: Utils
/* ****************************************************************************************************************** */

export function execCmd(cmd: string, opt?: any) {
  if (isDebugMode) console.log(`CMD: ${cmd} (cwd: ${opt?.cwd || process.cwd()})`);
  return execSync(cmd, { stdio, ...opt });
}

// endregion
