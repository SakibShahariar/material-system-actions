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
checksum_file="$archive.sha256"

# Validate every required input before creating output directories, compiling
# schemas, or touching an existing archive.
required_files=(
    metadata.json
    extension.js
    prefs.js
    stylesheet.css
)
required_dirs=(
    lib
    schemas
)
missing_paths=()
for path in "${required_files[@]}"; do
    [[ -f "$project_dir/$path" ]] || missing_paths+=("$path")
done
for path in "${required_dirs[@]}"; do
    [[ -d "$project_dir/$path" ]] || missing_paths+=("$path/")
done
if (("${#missing_paths[@]}" > 0)); then
    printf 'Cannot create extension package; required inputs are missing:\n' >&2
    printf '  - %s\n' "${missing_paths[@]}" >&2
    exit 1
fi

if ! command -v sha256sum >/dev/null 2>&1; then
    printf 'Cannot create extension package: sha256sum is required.\n' >&2
    exit 1
fi

mkdir -p "$output_dir"
glib-compile-schemas "$project_dir/schemas"

# Build to temporary files so a failed zip/checksum operation cannot leave a
# truncated archive or checksum at the public output paths.
tmp_archive=$(mktemp "$output_dir/.material-system-actions.XXXXXX.zip")
tmp_checksum=$(mktemp "$output_dir/.material-system-actions.XXXXXX.sha256")
# zip expects to create a new archive; an existing empty mktemp file is invalid.
rm -f "$tmp_archive"
cleanup() {
    rm -f "$tmp_archive" "$tmp_checksum"
}
trap cleanup EXIT

(
    cd "$project_dir"
    zip -q -r "$tmp_archive" metadata.json extension.js prefs.js stylesheet.css lib schemas
)

archive_name=$(basename "$archive")
archive_hash=$(sha256sum "$tmp_archive")
archive_hash=${archive_hash%% *}
printf '%s  %s\n' "$archive_hash" "$archive_name" > "$tmp_checksum"

mv -f "$tmp_archive" "$archive"
mv -f "$tmp_checksum" "$checksum_file"
trap - EXIT

printf 'Created %s\n' "$archive"
printf 'Created %s\n' "$checksum_file"
