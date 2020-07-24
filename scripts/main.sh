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
  [ ! -f "${OUT_DIR}/${TAG}/index.d.ts" ] && buildTypes "$TAG" || printf "Already built %s\n" "$TAG"

  # Publish Package
}

isIn() {
  set -e
  TAG=$1
  LIST=$2
  [ -z $3 ] && DELIMITER=" " || DELIMITER=$3

  IFS="$DELIMITER"
  for val in $LIST
  do
    case $val in
      $TAG) echo "$val";;
      *) :;;
    esac
  done
}


# #################################################################################################################### #
# Iterate Tags & Build
# #################################################################################################################### #

# Get our tags
ourTags=$(cd "$ROOT_PATH"; git tag -l | awk -v test="$GIT_TAG_REGEX" '$1~test')

# Get TS tags
tsTags=$(cd "${ROOT_PATH}/TypeScript"; git tag -l | awk -v test="$GIT_TAG_REGEX" '$1~test')

# Compare tags and build for each tag we don't have
for TAG in $tsTags
do
  # If it's not in our local tags
  if [ -z "$(isIn "$TAG" "$ourTags" "$(printf "\n\b")")" ]
  then
    # And it's not in skip list
    if [ -z "$(isIn "$TAG" "$SKIP_VERSIONS")" ]
    then
      build "$TAG"
    else
      echo "Skipping $TAG (in skip list) ..."
    fi
  fi
done

printf "\nDone with all builds!\n"