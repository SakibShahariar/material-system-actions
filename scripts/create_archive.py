#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-2.0-or-later
"""Create a deterministic ZIP archive from a staged extension tree."""

import sys
import stat
import zipfile
from pathlib import Path

FIXED_TIMESTAMP = (1980, 1, 1, 0, 0, 0)
COMPRESSION_LEVEL = 9


def _zip_info(name, is_directory):
    archive_name = f"{name}/" if is_directory else name
    info = zipfile.ZipInfo(archive_name, date_time=FIXED_TIMESTAMP)
    info.create_system = 3
    info.compress_type = zipfile.ZIP_DEFLATED
    info.extra = b""
    info.comment = b""
    mode = (stat.S_IFDIR | 0o755) if is_directory else (stat.S_IFREG | 0o644)
    info.external_attr = (mode & 0xFFFF) << 16
    if is_directory:
        info.external_attr |= 0x10
    return info


def create_archive(source_dir, output_path):
    source = Path(source_dir).resolve()
    output = Path(output_path).resolve()
    if not source.is_dir():
        raise ValueError(f"source directory does not exist: {source}")

    entries = []
    for path in source.rglob("*"):
        if path.is_symlink():
            raise ValueError(f"symbolic links are not supported in packages: {path}")
        if not path.is_dir() and not path.is_file():
            raise ValueError(f"unsupported package entry: {path}")
        entries.append((path.relative_to(source).as_posix(), path))

    entries.sort(key=lambda entry: entry[0])
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(
        output,
        mode="w",
        compression=zipfile.ZIP_DEFLATED,
        compresslevel=COMPRESSION_LEVEL,
    ) as archive:
        for name, path in entries:
            is_directory = path.is_dir()
            info = _zip_info(name, is_directory)
            data = b"" if is_directory else path.read_bytes()
            archive.writestr(
                info,
                data,
                compress_type=zipfile.ZIP_DEFLATED,
                compresslevel=COMPRESSION_LEVEL,
            )


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: create_archive.py SOURCE_DIR OUTPUT_ZIP")
    try:
        create_archive(sys.argv[1], sys.argv[2])
    except (OSError, ValueError, zipfile.BadZipFile) as error:
        raise SystemExit(f"package archive error: {error}") from error
