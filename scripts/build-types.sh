set -e

# #################################################################################################################### #
# Imports
# #################################################################################################################### #

# shellcheck source=config.sh
. "$(dirname "$(readlink -f "$0")")/config.sh"


# #################################################################################################################### #
# Build TS Types
# #################################################################################################################### #

buildTypes() {
  set -e

  PWD=$(pwd)

  # Parse and validate version tag
  version=$(echo "$1" | awk -v test="$GIT_TAG_REGEX" '$1~test')
  if [ -z "$version" ]
  then
    echo "Must supply a version tag (3.8+) as a parameter (ie. v3.9.6)"
    exit 1
  fi

  echo "Building types for $version ..."
  echo

  cd "${ROOT_PATH}/TypeScript" || exit 1

  # Reset environment
  git clean -xfd # deletes any untracted existing artifacts including node_modules
  git fetch origin
  git checkout --force "$version"

  # Install dependencies
  echo "Installing dependencies ..."
  echo
  npm install

  # Prepare code
  echo "Pre-processing code ..."
  echo
  node -r ts-node/register ../scripts/process.ts pre-build

  # Build Compiler
  echo "Building compiler ..."
  echo
  npm run build:compiler

  # Copy output file
  outFilePath="${OUT_DIR}/${version}/index.d.ts"
  mkdir -p "$OUT_DIR/$version"
  cp ./built/local/typescriptServices.d.ts "$outFilePath"

  if [ ! -f "$outFilePath" ]
  then
    echo "Could not find generated file $outFilePath"
    exit 1
  fi

  # Run post-build fixes
  echo "Post-processing types ..."
  echo
  node -r ts-node/register ../scripts/process.ts post-build "$version"

  # Type-Check generated file
  echo "Checking types ..."
  echo
  cd $ROOT_PATH || exit
  ./node_modules/typescript/bin/tsc $outFilePath

  echo "Finished building package for $version!"
  cd "$PWD" || exit 1
}