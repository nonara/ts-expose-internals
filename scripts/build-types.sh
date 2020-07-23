# #################################################################################################################### #
# Imports
# #################################################################################################################### #

# shellcheck source=config.sh
. "$(dirname "$(readlink -f "$0")")/config.sh"


# #################################################################################################################### #
# Build TS Types
# #################################################################################################################### #

buildTypes() {
  version=$0
  PWD=$(pwd)

  if [ -z "$version" ]
  then
    echo "Must supply a version tag as a parameter (ie. v3.9.6)"
    exit 1
  fi

  cd "${ROOT_DIR}/TypeScript" || exit 1

  # Reset environment
  git clean -xfd # deletes any untracted existing artifacts including node_modules
  git fetch origin
  git checkout "$version"

  # Install dependencies
  npm install

  # Prepare code
  node ../scripts/process.js pre-build

  # Build Compiler
  npm run build:compiler

  # Copy output file
  outFile="typescript-${version}.d.ts"
  mkdir -p "$OUT_DIR"
  cp ./built/local/typescriptServices.d.ts "${OUT_DIR}/${outFile}"

  if [ ! -f "$outFile" ]
  then
    echo "Could not generated find file $outFile"
    exit 1
  fi

  # Run post-build fixes
  node ../scripts/process.js post-build "$outFile"

  cd "$PWD" || exit 1

  # Return file name
  echo "$outFile"
}