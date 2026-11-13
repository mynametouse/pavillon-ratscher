#!/usr/bin/env python3
"""Tests of the publisher (publish.py, mode set and hallo) against a local bare repository - no network, no secret:
    python3 -I .github/actions/suhl-publish/test_publish.py
The products are the invented examples of tools/suhl/lib/beispiel (given to the set as folders of the checkout)."""
import json, os, shutil, subprocess, sys, tempfile, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'suhl', 'lib'))
import suhllib as S   # noqa: E402
import beispiel       # noqa: E402
import schema         # noqa: E402

SECRET = 'TESTSECRET-kein-echter-Schluessel-0123456789'      # stands for the token: must never show up in any output


def sh(*a, cwd=None):
    return subprocess.run(a, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True).stdout


class Publish(unittest.TestCase):
    def setUp(self):
        self.t = tempfile.mkdtemp(prefix='suhl-pub-')
        self.bare = os.path.join(self.t, 'daten.git')
        sh('git', 'init', '-q', '--bare', '-b', 'main', self.bare)
        seed = os.path.join(self.t, 'seed')
        sh('git', 'clone', '-q', self.bare, seed)
        with open(os.path.join(seed, 'README.md'), 'w') as f:
            f.write('# pavillon-daten\n')
        for c in (['config', 'user.email', 't@example.org'], ['config', 'user.name', 't'], ['add', '.'], ['commit', '-q', '-m', 'init'],
                  ['push', '-q', 'origin', 'HEAD:main']):
            sh('git', *c, cwd=seed)
        self.src = os.path.join(self.t, 'checkout')                   # a stand-in for the caller's checkout: lib + example products
        os.makedirs(os.path.join(self.src, 'tools', 'suhl'))
        shutil.copytree(os.path.join(ROOT, 'tools', 'suhl', 'lib'), os.path.join(self.src, 'tools', 'suhl', 'lib'), ignore=shutil.ignore_patterns('__pycache__'))
        shutil.copytree(os.path.join(ROOT, 'tools', 'welt'), os.path.join(self.src, 'tools', 'welt'), ignore=shutil.ignore_patterns('__pycache__'))
        shutil.copytree(os.path.join(ROOT, 'tools', 'suhl', 'out', 'bestand'), os.path.join(self.src, 'tools', 'suhl', 'out', 'bestand'))
        os.makedirs(os.path.join(self.src, 'viz3'))
        shutil.copy(os.path.join(ROOT, 'viz3', 'manifests.json'), os.path.join(self.src, 'viz3', 'manifests.json'))
        self.data = os.path.join(self.src, 'data')
        beispiel.write(self.data)
        self.n = 0

    def tearDown(self):
        shutil.rmtree(self.t)

    def run_set(self, products, dry=False, token=SECRET, remove=None, name='test'):
        self.n += 1
        work = os.path.join(self.t, f'work{self.n}')
        os.makedirs(work)
        sp = os.path.join(self.src, 'satz.json')
        S.write_json(sp, {'name': name, 'products': products, 'remove': remove or []})
        env = dict(os.environ, PUB_MODE='set', PUB_SET=sp, PUB_REPO_ROOT=self.src, PUB_TEST_URL='file://' + self.bare, RUNNER_TEMP=work,
                   GITHUB_OUTPUT=os.path.join(work, 'out'), GITHUB_STEP_SUMMARY=os.path.join(work, 'sum'), GITHUB_RUN_ID='4711', GITHUB_SHA='abcdef1234567890',
                   GITHUB_REPOSITORY='mynametouse/pavillon-ratscher', PUB_DRY='true' if dry else 'false')
        env.pop('DATEN_TOKEN', None)
        if token:
            env['DATEN_TOKEN'] = token
        p = subprocess.run([sys.executable, '-I', os.path.join(HERE, 'publish.py')], env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        txt_out, txt_sum = (S.read_bytes(os.path.join(work, n)).decode('utf-8') for n in ('out', 'sum'))
        out = dict(ln.split('=', 1) for ln in txt_out.splitlines() if '=' in ln)
        rp = os.path.join(work, 'satz-bericht.json')
        rep = S.read_json(rp) if os.path.exists(rp) else {}
        for txt in (p.stdout, txt_out, txt_sum, json.dumps(rep)):
            self.assertNotIn(SECRET, txt)
        return p.returncode, out, rep, p.stdout

    def prod(self, p, v=0, **kw):
        return dict({'folder': f'data/suhl/{p}/v{v}', 'version': v}, **kw)

    def files(self):
        return set(sh('git', 'ls-tree', '-r', '--name-only', 'main', cwd=self.bare).split())

    def head(self):
        return sh('git', 'rev-parse', 'main', cwd=self.bare).strip()

    def show(self, path):
        return sh('git', 'show', f'main:{path}', cwd=self.bare)

    def test_dry_run_then_publish_then_again(self):
        prods = {p: self.prod(p) for p in ('g', 's', 'm', 'b', 'gr', 'w')}
        h0 = self.head()
        rc, out, rep, log = self.run_set(prods, dry=True, token='')                       # a dry run needs no secret
        self.assertEqual((rc, out['published'], self.head()), (0, 'false', h0), log)
        self.assertIn('DRY RUN', out['reason'])
        self.assertEqual((rep['files_added'], rep['files_changed'], rep['files_removed'], rep['nojekyll']), (16, 0, 0, 'added'))
        self.assertTrue(all(q['valid'] for q in rep['products'].values()))
        rc, out, rep, log = self.run_set(prods)                                           # the real thing: one commit
        self.assertEqual((rc, out['published']), (0, 'true'), log)
        self.assertNotEqual(self.head(), h0)
        self.assertEqual(sh('git', 'rev-list', '--count', 'main', cwd=self.bare).strip(), '2')
        f = self.files()
        self.assertTrue({'.nojekyll', 'ATTRIBUTION.md', 'README.md', 'suhl/aktuell.json', 'suhl/g/v0/index.json', 'suhl/g/v0/10/497/542.json',
                         'suhl/w/v0/10/497/542.bin'} <= f, f)
        akt = json.loads(self.show('suhl/aktuell.json'))
        self.assertEqual(sorted(akt['products']), ['b', 'g', 'gr', 'm', 's', 'w'])
        self.assertEqual((akt['schema'], akt['products']['g']['path'], akt['products']['g']['version']), (1, 'g/v0/', 0))
        self.assertIn('Gebäude', self.show('ATTRIBUTION.md'))
        h1 = self.head()
        rc, out, rep, log = self.run_set(prods)                                           # the same set again: nothing changes
        self.assertEqual((rc, self.head()), (0, h1), log)
        self.assertEqual((rep['files_added'], rep['files_changed'], rep['files_removed'], rep['new_mb_in_repository']), (0, 0, 0, 0.0))
        self.assertIn('nothing changed', out['reason'])

    def test_published_versions_are_never_changed(self):
        self.assertEqual(self.run_set({'b': self.prod('b')})[0], 0)
        h1 = self.head()
        with open(os.path.join(self.data, 'suhl', 'b', 'v0', '10', '497', '542.bin'), 'ab') as f:
            f.write(schema.tree_pack([(1.0, 1.0, 9.0, 2.0, 0, 1)]))
        schema.normalise_index(os.path.join(self.data, 'suhl', 'b', 'v0'))
        rc, out, rep, log = self.run_set({'b': self.prod('b')})
        self.assertEqual((rc, out['published'], self.head()), (1, 'false', h1), log)
        self.assertIn('never changed', out['reason'])
        rc, out, rep, log = self.run_set({'b': self.prod('b', replace=True)})             # a sample version may be replaced on purpose
        self.assertEqual((rc, out['published']), (0, 'true'), log)
        self.assertEqual((rep['files_added'], rep['files_changed']), (0, 3))               # the tile, its index and aktuell.json (bytes)
        # the next generation as v1 with the same tiles: the tile costs nothing in the repository (same content)
        shutil.copytree(os.path.join(self.data, 'suhl', 'b', 'v0'), os.path.join(self.data, 'suhl', 'b', 'v1'))
        schema.normalise_index(os.path.join(self.data, 'suhl', 'b', 'v1'))
        rc, out, rep, log = self.run_set({'b': self.prod('b', 1)}, remove=['b/v0'])
        self.assertEqual((rc, out['published']), (0, 'true'), log)
        self.assertEqual(rep['removed_versions'], ['b/v0'])
        self.assertLess(rep['new_mb_in_repository'], 0.001)                               # only the index and aktuell.json are new content
        f = self.files()
        self.assertIn('suhl/b/v1/10/497/542.bin', f)
        self.assertNotIn('suhl/b/v0/10/497/542.bin', f)
        self.assertEqual(json.loads(self.show('suhl/aktuell.json'))['products']['b']['version'], 1)
        rc, out, rep, log = self.run_set({'b': self.prod('b', 1)}, remove=['b/v1'])       # the valid version cannot be removed
        self.assertEqual(rc, 1)
        self.assertIn('valid version', out['reason'])

    def test_a_set_must_be_consistent_and_valid(self):
        schema.normalise_index(os.path.join(self.data, 'suhl', 'g', 'v0'), based_on={'boden': 1})
        h0 = self.head()
        rc, out, rep, log = self.run_set({'g': self.prod('g')})
        self.assertEqual((rc, out['published'], self.head()), (1, 'false', h0), log)
        self.assertIn('computed on boden v1', out['reason'])
        self.assertIn('not consistent', out['reason'])
        schema.normalise_index(os.path.join(self.data, 'suhl', 'g', 'v0'), based_on={'s': 0})
        rc, out, rep, log = self.run_set({'g': self.prod('g'), 's': self.prod('s')})      # g stands on s v0, and the set brings s v0
        self.assertEqual((rc, out['published']), (0, 'true'), log)
        p = os.path.join(self.data, 'suhl', 'm', 'v0', '10', '497', '542.json')
        d = S.read_json(p)
        d['lampen'].append(5)
        S.write_json(p, d)
        rc, out, rep, log = self.run_set({'m': self.prod('m')})
        self.assertEqual(rc, 1)
        self.assertIn('not valid', out['reason'])
        rc, out, rep, log = self.run_set({'b': self.prod('b', 3)})                        # the set file names a version that is not there
        self.assertEqual(rc, 1)
        rc, out, rep, log = self.run_set({'b': {'run': 1, 'artifact': 'x', 'version': 0}})  # no gh, no token here: a clear refusal, no crash
        self.assertEqual(rc, 1)
        self.assertIn('could not be downloaded', out['reason'])

    def test_product_from_a_branch_at_a_commit(self):
        other = os.path.join(self.t, 'repo.git')                                  # stands for origin: a branch that holds a sample
        sh('git', 'init', '-q', '--bare', '-b', 'main', other)
        sh('git', 'config', 'uploadpack.allowAnySHA1InWant', 'true', cwd=other)
        w = os.path.join(self.t, 'w')
        sh('git', 'clone', '-q', other, w)
        shutil.copytree(os.path.join(self.data, 'suhl', 'b', 'v0'), os.path.join(w, 'tools', 'suhl', 'out', 'gruen', 'probe', 'suhl', 'b', 'v0'))
        for c in (['config', 'user.email', 't@example.org'], ['config', 'user.name', 't'], ['add', '.'], ['commit', '-q', '-m', 'sample'],
                  ['push', '-q', 'origin', 'HEAD:refs/heads/suhl/gruen']):
            sh('git', *c, cwd=w)
        sha = sh('git', 'rev-parse', 'HEAD', cwd=w).strip()
        sh('git', 'init', '-q', self.src)
        sh('git', 'remote', 'add', 'origin', 'file://' + other, cwd=self.src)
        src = {'branch': 'suhl/gruen', 'commit': sha, 'path': 'tools/suhl/out/gruen/probe/suhl/b/v0', 'version': 0}
        rc, out, rep, log = self.run_set({'b': src})
        self.assertEqual((rc, out['published']), (0, 'true'), log)
        self.assertIn('suhl/gruen at ' + sha[:8], rep['products']['b']['from'])
        self.assertIn('suhl/b/v0/10/497/542.bin', self.files())
        rc, out, rep, log = self.run_set({'b': dict(src, path='tools/suhl/out/gruen/probe/suhl/w/v0')})
        self.assertEqual(rc, 1)
        self.assertIn('does not exist at commit', out['reason'])
        rc, out, rep, log = self.run_set({'b': dict(src, commit='HEAD; rm -rf /')})
        self.assertEqual(rc, 1)
        self.assertIn('need a commit id', out['reason'])

    def test_no_secret_is_not_a_failed_run(self):
        h0 = self.head()
        rc, out, rep, log = self.run_set({'b': self.prod('b')}, token='')
        self.assertEqual((rc, out['published'], self.head()), (0, 'false', h0), log)
        self.assertIn('DATEN_TOKEN is empty', out['reason'])


if __name__ == '__main__':
    unittest.main(verbosity=1)
