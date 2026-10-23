import base64
import gzip
import hashlib
import json
import re
import importlib.util
import io
import pathlib
import tarfile
import tempfile
import unittest

MODULE = pathlib.Path(__file__).parents[1] / 'deploy/ci/extract-release.py'
spec = importlib.util.spec_from_file_location('release_extract', MODULE)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
REQUIRED = ['pms/package.json', 'pms/server/main.js', 'pms/server/http.js', 'pms/server/store.js',
            'pms/src/demo-store.js', 'pms/src/inventory.js', 'pms/web/index.html', 'pms/web/app.js']


def archive(extra=None, omit=None):
    stream = io.BytesIO()
    with tarfile.open(fileobj=stream, mode='w:gz') as output:
        for name in REQUIRED:
            if name == omit:
                continue
            info = tarfile.TarInfo(name)
            payload = b'TEST CONTENT'
            info.size = len(payload)
            output.addfile(info, io.BytesIO(payload))
        if extra:
            output.addfile(*extra)
    stream.seek(0)
    return stream


class ReleaseArchiveTests(unittest.TestCase):
    def test_bootstrap_matches_reviewable_sources(self):
        root = pathlib.Path(__file__).parents[2]
        text = (root / 'pms/deploy/ci/BOOTSTRAP.txt').read_text()
        payload = re.search(r"payload = '([^']+)'", text).group(1)
        digest = re.search(r"hexdigest\(\) != '([a-f0-9]+)'", text).group(1)
        data = gzip.decompress(base64.b64decode(payload))
        self.assertEqual(hashlib.sha256(data).hexdigest(), digest)
        for name, content in json.loads(data).items():
            self.assertEqual((root / name).read_text(), content)

    def test_valid_release(self):
        with tempfile.TemporaryDirectory() as path:
            module.extract(archive(), path)
            self.assertEqual((pathlib.Path(path) / 'pms/server/main.js').read_bytes(), b'TEST CONTENT')

    def test_reject_path_escape_and_unrelated_files(self):
        for name in ['../etc/sudoers', '/etc/passwd', 'pms/src/../../file', 'pms/deploy/install.sh', 'pms/.data/jovian.sqlite']:
            with self.subTest(name=name), tempfile.TemporaryDirectory() as path:
                info = tarfile.TarInfo(name)
                with self.assertRaises(ValueError):
                    module.extract(archive((info, io.BytesIO())), path)
                self.assertEqual(list(pathlib.Path(path).iterdir()), [])

    def test_reject_links_duplicates_and_missing_files(self):
        for name, kind in [('pms/src/link', tarfile.SYMTYPE), ('pms/src/link', tarfile.LNKTYPE), ('pms/web/app.js', tarfile.REGTYPE)]:
            with self.subTest(kind=kind), tempfile.TemporaryDirectory() as path:
                info = tarfile.TarInfo(name)
                info.type = kind
                info.linkname = '/etc/passwd'
                with self.assertRaises(ValueError):
                    module.extract(archive((info, None)), path)
        with tempfile.TemporaryDirectory() as path:
            with self.assertRaises(ValueError):
                module.extract(archive(omit='pms/server/main.js'), path)

    def test_reject_expanded_size_before_writing(self):
        old = module.MAX_TOTAL
        try:
            module.MAX_TOTAL = 12
            with tempfile.TemporaryDirectory() as path:
                with self.assertRaises(ValueError):
                    module.extract(archive(), path)
                self.assertEqual(list(pathlib.Path(path).iterdir()), [])
        finally:
            module.MAX_TOTAL = old


if __name__ == '__main__':
    unittest.main()
