#!/usr/bin/env bash
set -euo pipefail

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
tmp_root=$(mktemp -d)
trap 'rm -rf "$tmp_root"' EXIT

project="$tmp_root/project"
stub_bin="$tmp_root/bin"
mkdir -p "$project/scripts" "$project/lib" "$project/schemas" "$project/prototype" "$project/tests" "$project/.github/workflows" "$project/docs" "$stub_bin"
cp "$repo_root/scripts/package.sh" "$project/scripts/package.sh"
cp "$repo_root/scripts/create_archive.py" "$project/scripts/create_archive.py"
chmod +x "$project/scripts/package.sh"

for path in metadata.json extension.js prefs.js stylesheet.css; do
    printf 'fixture for %s\n' "$path" > "$project/$path"
done
printf '<schemalist/>\n' > "$project/schemas/example.gschema.xml"
# Seed development-only paths to prove the installable archive excludes them.
printf 'development notes\n' > "$project/README.md"
printf 'agent guidance\n' > "$project/AGENTS.md"
printf 'prototype\n' > "$project/prototype/demo.py"
printf 'test source\n' > "$project/tests/example.test.mjs"
printf 'workflow\n' > "$project/.github/workflows/package.yml"
printf 'docs\n' > "$project/docs/notes.md"
printf 'helper\n' > "$project/scripts/dev-helper.sh"

cat > "$stub_bin/glib-compile-schemas" <<'STUB'
#!/usr/bin/env bash
set -euo pipefail
: "${GLIB_STUB_MARKER:?GLIB_STUB_MARKER must be set}"
schema_dir="${@: -1}"
: > "$GLIB_STUB_MARKER"
printf 'compiled schema fixture\n' > "$schema_dir/gschemas.compiled"
STUB
chmod +x "$stub_bin/glib-compile-schemas"

archive_name='material-system-actions@sakib.dev.shell-extension.zip'
missing_output="$tmp_root/missing-output"
compile_marker="$tmp_root/compile-was-run"

# Missing required files fail before output creation or schema compilation.
rm "$project/prefs.js"
if PATH="$stub_bin:$PATH" GLIB_STUB_MARKER="$compile_marker" \
    "$project/scripts/package.sh" "$missing_output" >"$tmp_root/missing.log" 2>&1; then
    printf 'Expected packaging to fail when prefs.js is missing.\n' >&2
    exit 1
fi
grep -Fq 'prefs.js' "$tmp_root/missing.log"
[[ ! -e "$missing_output" ]]
[[ ! -e "$compile_marker" ]]

# Build twice with different source mtimes/modes. Normalized ZIP metadata
# must make the resulting archives byte-for-byte identical.
printf 'fixture for prefs.js\n' > "$project/prefs.js"
touch -d '@1000000000' "$project/extension.js"
chmod 0644 "$project/extension.js"
output="$tmp_root/output"
PATH="$stub_bin:$PATH" GLIB_STUB_MARKER="$compile_marker" \
    "$project/scripts/package.sh" "$output"
archive="$output/$archive_name"
checksum="$archive.sha256"

[[ -s "$archive" ]]
[[ -s "$checksum" ]]
[[ "$(basename "$archive")" == "$archive_name" ]]
[[ -e "$compile_marker" ]]
[[ ! -e "$project/schemas/gschemas.compiled" ]]
(
    cd "$output"
    sha256sum --check "$(basename "$checksum")"
)

touch -d '@1700000000' "$project/extension.js"
chmod 0755 "$project/extension.js"
output_second="$tmp_root/output-second"
PATH="$stub_bin:$PATH" GLIB_STUB_MARKER="$compile_marker" \
    "$project/scripts/package.sh" "$output_second"
archive_second="$output_second/$archive_name"
checksum_second="$archive_second.sha256"
cmp "$archive" "$archive_second"
cmp "$checksum" "$checksum_second"
(
    cd "$output_second"
    sha256sum --check "$(basename "$checksum_second")"
)

python3 - "$archive" <<'PY'
import sys
import zipfile

archive = sys.argv[1]
with zipfile.ZipFile(archive) as package:
    names = set(package.namelist())
required = {
    "metadata.json",
    "extension.js",
    "prefs.js",
    "stylesheet.css",
    "lib/",
    "schemas/",
    "schemas/example.gschema.xml",
    "schemas/gschemas.compiled",
}
missing = required - names
if missing:
    raise SystemExit(f"Package is missing entries: {sorted(missing)}")

development_paths = (
    "README.md",
    "AGENTS.md",
    "prototype/",
    "tests/",
    ".github/",
    "docs/",
    "scripts/",
)
unexpected = sorted(
    name for name in names
    if any(name == path or name.startswith(path) for path in development_paths)
)
if unexpected:
    raise SystemExit(f"Package contains development-only entries: {unexpected}")
PY

printf 'Reproducible package, preflight, and checksum tests passed.\n'
