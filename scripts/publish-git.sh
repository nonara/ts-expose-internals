set -e

# #################################################################################################################### #
# Imports
# #################################################################################################################### #

# shellcheck source=config.sh
. "$(dirname "$(readlink -f "$0")")/config.sh"


# #################################################################################################################### #
# Build TS Types
# #################################################################################################################### #

publishGit() {
  set -e
  PWD=$(pwd)

  # Parse and validate version tag
  version=$(echo "$1" | awk -v test="$GIT_TAG_REGEX" '$1~test')
  if [ -z "$version" ]
  then
    echo "Must supply a version tag (3.8+) as a parameter (ie. v3.9.6)"
    exit 1
  fi

  printf "Publishing to github ...\n\n"

  cd "${ROOT_PATH}" || exit 1

  # Commit files
  echo git add -A
  echo git commit -m "$version"
  echo git push

  # Add tag
  echo git tag "$version"
  echo git push --tags

  cd "$PWD" || exit 1
}

# Execute if manually invoked by itself
# shellcheck disable=SC2015
[ -n "$1" ] && publishGit "$1" || :