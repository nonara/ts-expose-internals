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
  TAG=$0
  echo "Building types for $TAG ..."

  # Build Types file
  outFile=$(buildTypes "$TAG")

  if [ ! -f "$outFile" ]
  then
    echo "Could not find output file $outFile!"
    exit 1
  fi

  # Publish Package

}

# #################################################################################################################### #
# Cron Activity
# #################################################################################################################### #

# Get our tags
ourTags=$(git tag -l | awk '/^v[0-9]/')

# Get TS tags
cd ./TypeScript
tsTags=$(git tag -l | awk '/^v[0-9]/')
cd ..

# Compare tags and build for each tag we don't have
for TAG in $tsTags
do
  case $TAG in
    $ourTags) :;; # noop - skip tags we already have
    *) build "$TAG";;
  esac
done