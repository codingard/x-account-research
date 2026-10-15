import importlib.util
import json
import pathlib
import tempfile
import unittest
spec=importlib.util.spec_from_file_location('analyze',pathlib.Path(__file__).resolve().parents[1]/'analyze.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class PreparationTest(unittest.TestCase):
    def fixture(self):
        return {'schema_version':1,'collector':'browser-observed-v1','manifest':{'handle':'test','requested':100,'selected':['1'],'stop_reason':'timeline_stalled','details':[],'media':[]},'posts':[{'id':'1','author':'test','url':'https://x.com/test/status/1','text':'A post','metrics':{'views':None,'likes':0},'media':[]}]}
    def test_unknown_not_zero_and_partial_explicit(self):
        with tempfile.TemporaryDirectory() as d:
            p=pathlib.Path(d);s=p/'snapshot.json';s.write_text(json.dumps(self.fixture()));m.prepare(s,p/'analysis')
            stats=json.loads((p/'analysis/statistics.json').read_text());coverage=json.loads((p/'analysis/coverage.json').read_text())
            self.assertIsNone(stats['metrics']['views']['median']);self.assertEqual(stats['metrics']['likes']['median'],0)
            self.assertTrue(any('1/100' in issue for issue in coverage['issues']))
    def test_self_quotes_and_time_window_keep_old_context(self):
        with tempfile.TemporaryDirectory() as d:
            p=pathlib.Path(d);data=self.fixture();data['manifest']['collected_at']='2026-10-13T12:00:00+00:00'
            data['posts'][0].update(created_at='2026-10-12T12:00:00+00:00',quoted_id='2')
            data['posts'].append({'id':'2','author':'test','url':'https://x.com/test/status/2','text':'Old original','created_at':'2026-08-01T12:00:00+00:00','metrics':{'views':100},'media':[]})
            data['manifest']['selected'].append('2')
            source=p/'snapshot.json';source.write_text(json.dumps(data));m.prepare(source,p/'analysis',30)
            graph=json.loads((p/'analysis/quote-graph.json').read_text());stats=json.loads((p/'analysis/statistics.json').read_text())
            self.assertEqual(stats['count'],1);self.assertEqual(graph[0]['relationship'],'self');self.assertEqual(graph[0]['original_views'],100)
            self.assertEqual(len((p/'analysis/posts.jsonl').read_text().splitlines()),2)
    def test_browser_changed_image_suffix(self):
        with tempfile.TemporaryDirectory() as d:
            p=pathlib.Path(d);(p/'media').mkdir();(p/'media/image.png').write_bytes(b'fixture')
            data=self.fixture();data['manifest']['media']=[{'path':'media/image.jpg','url':'https://pbs.twimg.com/media/test?format=png','state':'complete'}]
            source=p/'snapshot.json';source.write_text(json.dumps(data));m.prepare(source,p/'analysis')
            media=json.loads((p/'analysis/media-index.json').read_text())
            self.assertTrue(media[0]['local_file_exists']);self.assertTrue(media[0]['resolved_from_url_format'])
    def test_path_traversal_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            p=pathlib.Path(d);data=self.fixture();data['manifest']['media']=[{'path':'../secret','state':'complete'}];s=p/'snapshot.json';s.write_text(json.dumps(data))
            with self.assertRaises(ValueError):m.prepare(s,p/'analysis')
if __name__=='__main__':unittest.main()
