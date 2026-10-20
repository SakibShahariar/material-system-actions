#!/usr/bin/env bash
# Build an installable archive without repository metadata.
set -euo pipefail

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
output_dir=${1:-"$project_dir/dist"}
# Resolve relative output paths before the subshell changes directories.
case "$output_dir" in
    /*) ;;
    *) output_dir="$PWD/$output_dir" ;;
esac
archive="$output_dir/material-system-actions@sakib.dev.shell-extension.zip"

mkdir -p "$output_dir"
glib-compile-schemas "$project_dir/schemas"
rm -f "$archive"
(
    cd "$project_dir"
    zip -q -r "$archive" metadata.json extension.js prefs.js stylesheet.css lib schemas
)
printf 'Created %s\n' "$archive"
