#!/usr/bin/env python3
"""Extract only bounded regular PMS source files; never extract links or arbitrary paths."""
import gzip
import io
import pathlib
import sys
import tarfile

MAX_ARCHIVE = 8 * 1024 * 1024
MAX_FILES = 400
MAX_TOTAL = 16 * 1024 * 1024


def extract(stream, destination):
    payload = stream.read(MAX_ARCHIVE + 1)
    if len(payload) > MAX_ARCHIVE:
        raise ValueError('release archive too large')
    root = pathlib.Path(destination)
    with gzip.GzipFile(fileobj=io.BytesIO(payload)) as compressed:
        expanded = compressed.read(MAX_TOTAL + 2 * 1024 * 1024 + 1)
    if len(expanded) > MAX_TOTAL + 2 * 1024 * 1024:
        raise ValueError('expanded archive too large')
    with tarfile.open(fileobj=io.BytesIO(expanded), mode='r:') as archive:
        members = []
        seen = set()
        total = 0
        for member in archive:
            path = pathlib.PurePosixPath(member.name)
            parts = path.parts
            if (path.is_absolute() or '..' in parts or not parts or parts[0] != 'pms'
                    or member.name != str(path) or member.name in seen):
                raise ValueError('invalid or duplicate archive path')
            allowed_dir = member.isdir() and (str(path) == 'pms' or len(parts) >= 2 and parts[1] in ('src', 'server', 'web'))
            allowed_file = member.isfile() and (str(path) == 'pms/package.json' or len(parts) >= 3 and parts[1] in ('src', 'server', 'web'))
            if not (allowed_dir or allowed_file):
                raise ValueError('only regular PMS source files are allowed')
            if len(members) >= MAX_FILES or member.size < 0:
                raise ValueError('invalid release size')
            total += member.size
            if total > MAX_TOTAL:
                raise ValueError('expanded release too large')
            seen.add(member.name)
            members.append(member)
        required = {'pms/package.json', 'pms/server/main.js', 'pms/server/http.js', 'pms/server/store.js',
                    'pms/src/demo-store.js', 'pms/src/inventory.js', 'pms/web/index.html', 'pms/web/app.js'}
        if not required <= {m.name for m in members if m.isfile()}:
            raise ValueError('incomplete PMS release')
        for member in members:
            target = root.joinpath(*pathlib.PurePosixPath(member.name).parts)
            if member.isdir():
                target.mkdir(parents=True, exist_ok=True, mode=0o700)
            else:
                target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
                with archive.extractfile(member) as source, target.open('xb') as output:
                    output.write(source.read())
                target.chmod(0o600)


if __name__ == '__main__':
    try:
        extract(sys.stdin.buffer, sys.argv[1])
    except Exception as error:
        print('PMS release rejected: ' + str(error), file=sys.stderr)
        sys.exit(1)
