set -e

# #################################################################################################################### #
# Imports
# #################################################################################################################### #

# shellcheck source=config.sh
. "$(dirname "$(readlink -f "$0")")/config.sh"


# #################################################################################################################### #
# Build TS Types
# #################################################################################################################### #

publishNpm() {
  set -e
  PWD=$(pwd)

  # Parse and validate version tag
  version=$(echo "$1" | awk -v test="$GIT_TAG_REGEX" '$1~test')
  if [ -z "$version" ]
  then
    echo "Must supply a version tag (3.8+) as a parameter (ie. v3.9.6)"
    exit 1
  fi

  # Get npm tag if special version (rc, beta, etc)
  tag=$(echo "$1" | gawk 'match($0, /-(.+)/, a) {print a[1]}')
  [ -z "$tag" ] && tag="latest" || :

  # Publish to NPM
  cd "$OUT_DIR" || exit 1
  npm publish --ignore-scripts --cache "${ROOT_PATH}/.cache" --tag "$tag"

  cd "$PWD" || exit 1
}

# Execute if manually invoked by itself
# shellcheck disable=SC2015
[ -n "$1" ] && publishNpm "$1" || :