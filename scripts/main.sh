#!/bin/sh
set -e

# #################################################################################################################### #
# Imports
# #################################################################################################################### #

# shellcheck source=config.sh
. "$(dirname "$(readlink -f "$0")")/config.sh"
# shellcheck source=build-types.sh
. "${SCRIPT_PATH}/build-types.sh"


# #################################################################################################################### #
# Helpers
# #################################################################################################################### #

build() {
  set -e

  TAG=$1

  # Build Types file
  [ ! -f "${OUT_DIR}/${TAG}/index.d.ts" ] && buildTypes "$TAG" || echo "Already built $TAG"

  # Publish Package
}

isIn() {
  set -e

  TAG=$1

  for val in $SKIP_VERSIONS
  do
    case $val in
      $TAG) echo "$val";;
      *) :;;
    esac
  done
}

# #################################################################################################################### #
# Cron Activity
# #################################################################################################################### #

# Get our tags
ourTags=$(git tag -l | awk -v test="$GIT_TAG_REGEX" '$1~test')

# Get TS tags
cd ./TypeScript
tsTags=$(git tag -l | awk -v test="$GIT_TAG_REGEX" '$1~test')
cd ..

# Compare tags and build for each tag we don't have
for TAG in $tsTags
do
  case $TAG in
    $ourTags) :;; # noop - skip tags we already have
    *)
      buildTag=$(isIn "$TAG")
      [ -z "$buildTag" ] && build "$TAG" || echo "Skipping $TAG (in skip list) ..."
  esac
done

echo "Done with all builds"