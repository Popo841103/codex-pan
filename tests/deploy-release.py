from pathlib import Path
import hashlib, importlib.util, json, tempfile, unittest, zipfile
spec=importlib.util.spec_from_file_location('deploy',Path(__file__).parents[1]/'scripts/deploy/cohub-release.py');deploy=importlib.util.module_from_spec(spec);spec.loader.exec_module(deploy)
class DeploymentTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.base=Path(self.tmp.name);self.root=self.base/'cohub';self.root.mkdir();(self.root/'index.html').write_text('CO-HUB old');(self.root/'app.js').write_text('old app');(self.root/'unrelated.txt').write_text('keep me')
        self.data={'index.html':b'CO-HUB new','app.js':b'new app','community.html':b'new community','guide.html':b'new guide','enquiry.html':b'new enquiry','enquiry.js':b'new enquiry js'}
        self.zip=self.base/'release.zip'
        self.make_zip()
    def tearDown(self):self.tmp.cleanup()
    def make_zip(self):
        manifest={'version':'test','files':{n:deploy.digest(v) for n,v in self.data.items()},'baseline':{n:deploy.digest((self.root/n).read_bytes()) for n in ['index.html','app.js']}}
        with zipfile.ZipFile(self.zip,'w') as z:
            for n,v in self.data.items():z.writestr(n,v)
            z.writestr('_deploy/manifest.json',json.dumps(manifest))
    def apply(self,probe=None):return deploy.apply_release(self.root,self.zip,self.base/'backups',probe or (lambda n:(self.root/n).read_bytes()),log=lambda x:None)
    def test_backup_and_apply_preserve_other_files(self):
        backup=self.apply();self.assertTrue((backup/'site-before.tar.gz').exists());self.assertEqual((self.root/'index.html').read_bytes(),self.data['index.html']);self.assertEqual((self.root/'unrelated.txt').read_text(),'keep me')
    def test_failed_live_verification_rolls_back(self):
        def probe(name):return (self.root/name).read_bytes() if name=='index.html' else b'wrong served page'
        with self.assertRaises(deploy.DeploymentError):self.apply(probe)
        self.assertEqual((self.root/'index.html').read_text(),'CO-HUB old');self.assertEqual((self.root/'app.js').read_text(),'old app');self.assertFalse((self.root/'community.html').exists());self.assertEqual((self.root/'unrelated.txt').read_text(),'keep me')
    def test_changed_site_file_is_not_overwritten(self):
        (self.root/'app.js').write_text('a different developers change')
        with self.assertRaises(deploy.DeploymentError):self.apply()
        self.assertEqual((self.root/'app.js').read_text(),'a different developers change');self.assertEqual((self.root/'index.html').read_text(),'CO-HUB old')
    def test_trusted_server_baseline_rejects_release_supplied_override(self):
        trusted={n:deploy.digest((self.root/n).read_bytes()) for n in ['index.html','app.js']}
        (self.root/'app.js').write_text('unexpected manual update')
        self.make_zip() # The uploaded manifest now accepts that manual change.
        with self.assertRaises(deploy.DeploymentError):
            deploy.apply_release(self.root,self.zip,self.base/'backups',lambda n:(self.root/n).read_bytes(),baseline_override=trusted)
        self.assertEqual((self.root/'index.html').read_text(),'CO-HUB old')
    def test_followup_release_uses_last_successful_hashes(self):
        self.apply()
        previous={n:deploy.digest(v) for n,v in self.data.items()}
        self.data['index.html']=b'CO-HUB second release'
        self.make_zip()
        deploy.apply_release(self.root,self.zip,self.base/'backups',lambda n:(self.root/n).read_bytes(),log=lambda x:None,baseline_override=previous)
        self.assertEqual((self.root/'index.html').read_bytes(),b'CO-HUB second release')
    def test_wrong_root_is_not_changed(self):
        with self.assertRaises(deploy.DeploymentError):self.apply(lambda n:b'another served site')
        self.assertEqual((self.root/'index.html').read_text(),'CO-HUB old')
    def test_path_escape_rejected(self):
        self.data['../outside.html']=b'bad';self.make_zip()
        with self.assertRaises(deploy.DeploymentError):self.apply()
        self.assertFalse((self.base/'outside.html').exists())
if __name__=='__main__':unittest.main()
