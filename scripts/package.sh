#!/usr/bin/env bash
# Build an installable, reproducible archive without modifying the checkout.
set -euo pipefail

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
output_dir=${1:-"$project_dir/dist"}
# Resolve relative output paths before entering any temporary directory.
case "$output_dir" in
    /*) ;;
    *) output_dir="$PWD/$output_dir" ;;
esac
archive="$output_dir/material-system-actions@sakib.dev.shell-extension.zip"
checksum_file="$archive.sha256"

# Validate every build input before creating output directories or compiling
# schemas. The archive helper is a required build input, not a runtime asset.
required_files=(
    metadata.json
    extension.js
    prefs.js
    stylesheet.css
    scripts/create_archive.py
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

for command in sha256sum python3 glib-compile-schemas; do
    if ! command -v "$command" >/dev/null 2>&1; then
        printf 'Cannot create extension package: %s is required.\n' "$command" >&2
        exit 1
    fi
done

mkdir -p "$output_dir"
tmp_dir=$(mktemp -d "$output_dir/.material-system-actions.XXXXXX")
cleanup() {
    rm -rf "$tmp_dir"
}
trap cleanup EXIT

stage_dir="$tmp_dir/package"
tmp_archive="$tmp_dir/package.zip"
tmp_checksum="$tmp_dir/package.zip.sha256"
mkdir -p "$stage_dir"

cp "$project_dir/metadata.json" "$project_dir/extension.js" \
    "$project_dir/prefs.js" "$project_dir/stylesheet.css" "$stage_dir/"
cp -a "$project_dir/lib" "$project_dir/schemas" "$stage_dir/"
# Never reuse a stale compiled schema copied from a previous build.
rm -f "$stage_dir/schemas/gschemas.compiled"
glib-compile-schemas --strict "$stage_dir/schemas"

python3 "$project_dir/scripts/create_archive.py" "$stage_dir" "$tmp_archive"

archive_name=$(basename "$archive")
archive_hash=$(sha256sum "$tmp_archive")
archive_hash=${archive_hash%% *}
printf '%s  %s\n' "$archive_hash" "$archive_name" > "$tmp_checksum"

# Both temporary files live under output_dir, so these renames stay on one FS.
mv -f "$tmp_archive" "$archive"
mv -f "$tmp_checksum" "$checksum_file"
trap - EXIT
rm -rf "$tmp_dir"

printf 'Created %s\n' "$archive"
printf 'Created %s\n' "$checksum_file"
