#!/usr/bin/env python3
"""Package the complete review set, including the compressed preview library."""
import os
import sys
import zipfile

root, archive = sys.argv[1:3]
os.makedirs(os.path.dirname(archive), exist_ok=True)
with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as output:
    def add(path, arcname):
        info = zipfile.ZipInfo(arcname, (1980, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        output.writestr(info, open(path, 'rb').read(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=6)
    audio_root = os.path.join(root, 'public', 'audio-previews')
    for folder, dirs, files in os.walk(audio_root):
        dirs.sort()
        for filename in sorted(files):
            path = os.path.join(folder, filename)
            add(path, os.path.relpath(path, root))
    license_path = os.path.join(root, 'AUDIO_ASSET_LICENSES.md')
    add(license_path, 'AUDIO_ASSET_LICENSES.md')
