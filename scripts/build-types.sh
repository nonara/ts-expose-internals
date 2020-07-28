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

  printf "Building types for %s ...\n\n" "$version"

  cd "${ROOT_PATH}/TypeScript" || exit 1

  # Reset environment
  git clean -xfd # deletes any existing artifacts including node_modules
  git fetch origin
  git checkout --force "$version"

  # Install dependencies
  printf "Installing dependencies ...\n\n"
  npm install --cache "${ROOT_PATH}/.cache" --no-audit

  # Prepare code
  printf "Pre-processing code ...\n\n"
  node -r ts-node/register ../scripts/process.ts pre-build

  # Build Compiler
  printf "Building compiler ...\n\n"
  npm run build:compiler

  # Clean output directory (leaves .npmrc)
  rm -rf "${OUT_DIR:?}"/*

  # Copy output file
  outFilePath="${OUT_DIR}/typescript.d.ts"
  cp ./built/local/typescriptServices.d.ts "$outFilePath"

  if [ ! -f "$outFilePath" ]
  then
    printf "\nCould not find generated file %s\n" "$outFilePath"
    exit 1
  fi

  # Run post-build fixes
  printf "Post-processing types ...\n\n"
  node -r ts-node/register ../scripts/process.ts post-build "$version"

  # Type-Check generated file
  printf "Checking types ...\n\n"
  cd "$ROOT_PATH" || exit 1
  ./node_modules/typescript/bin/tsc "$outFilePath" index.d.ts

  printf "Finished building package for %s!\n\n" "$version"
  cd "$PWD" || exit 1
}

# Execute if manually invoked by itself
# shellcheck disable=SC2015
[ -n "$1" ] && buildTypes "$1" || :