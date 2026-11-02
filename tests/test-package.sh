#!/usr/bin/env bash
set -euo pipefail

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
tmp_root=$(mktemp -d)
trap 'rm -rf "$tmp_root"' EXIT

project="$tmp_root/project"
stub_bin="$tmp_root/bin"
mkdir -p "$project/scripts" "$project/lib" "$project/schemas" "$stub_bin"
cp "$repo_root/scripts/package.sh" "$project/scripts/package.sh"
chmod +x "$project/scripts/package.sh"

for path in metadata.json extension.js prefs.js stylesheet.css; do
    printf 'fixture for %s\n' "$path" > "$project/$path"
done
printf '<schemalist/>\n' > "$project/schemas/example.gschema.xml"

cat > "$stub_bin/glib-compile-schemas" <<'STUB'
#!/usr/bin/env bash
: "${GLIB_STUB_MARKER:?GLIB_STUB_MARKER must be set}"
: > "$GLIB_STUB_MARKER"
STUB
chmod +x "$stub_bin/glib-compile-schemas"

archive_name='material-system-actions@sakib.dev.shell-extension.zip'
missing_output="$tmp_root/missing-output"
compile_marker="$tmp_root/compile-was-run"

# A missing required file must fail before output creation or schema compilation.
rm "$project/prefs.js"
if PATH="$stub_bin:$PATH" GLIB_STUB_MARKER="$compile_marker" \
    "$project/scripts/package.sh" "$missing_output" >"$tmp_root/missing.log" 2>&1; then
    printf 'Expected packaging to fail when prefs.js is missing.\n' >&2
    exit 1
fi
grep -Fq 'prefs.js' "$tmp_root/missing.log"
[[ ! -e "$missing_output" ]]
[[ ! -e "$compile_marker" ]]

# A complete source tree must produce a valid archive and matching checksum.
printf 'fixture for prefs.js\n' > "$project/prefs.js"
output="$tmp_root/output"
PATH="$stub_bin:$PATH" GLIB_STUB_MARKER="$compile_marker" \
    "$project/scripts/package.sh" "$output"
archive="$output/$archive_name"
checksum="$archive.sha256"

[[ -s "$archive" ]]
[[ -s "$checksum" ]]
[[ -e "$compile_marker" ]]
(
    cd "$output"
    sha256sum --check "$(basename "$checksum")"
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
}
missing = required - names
if missing:
    raise SystemExit(f"Package is missing entries: {sorted(missing)}")
PY

printf 'Package validation and checksum tests passed.\n'
