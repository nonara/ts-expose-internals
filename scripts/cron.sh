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
  if [ ! -f "${OUT_DIR}/${TAG}/index.d.ts" ]
  then
    buildTypes "$TAG"
    cd "$OUT_DIR" || exit 1
    npm publish "./$TAG" --ignore-scripts --cache "${ROOT_PATH}/.cache"
  else
    printf "Already built %s\n" "$TAG"
  fi
}

isIn() {
  set -e
  TAG=$1
  LIST=$2
  [ -z "$3" ] && DELIMITER=" " || DELIMITER=$3

  IFS="$DELIMITER"
  for val in $LIST
  do
    case $val in
      $TAG) echo "$val";;
      *) :;;
    esac
  done
}

getTags() {
  set -e
  [ -z "$1" ] && DIR="$ROOT_PATH" || DIR="$1"

  echo "$(
    cd "$DIR";
    git fetch --all --tags -q;
    git tag -l | awk -v test="$GIT_TAG_REGEX" '$1~test'
  )"
}


# #################################################################################################################### #
# Iterate Tags & Build
# #################################################################################################################### #

PWD=$(pwd)

# Sync and get lists of repository tags
ourTags=$(getTags)
tsTags=$(getTags "${ROOT_PATH}/TypeScript")

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

cd "$PWD"

printf "\nDone with all builds!\n"