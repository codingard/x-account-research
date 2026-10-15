import importlib.util,json,pathlib,tempfile,unittest,csv
spec=importlib.util.spec_from_file_location('dataset',pathlib.Path(__file__).resolve().parents[1]/'dataset.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class DatasetTest(unittest.TestCase):
 def fixture(self,p):
  (p/'media').mkdir();(p/'media/x.png').write_bytes(b'example')
  data={'schema_version':1,'manifest':{'selected':['1'],'media':[{'path':'media/x.jpg','url':'https://pbs.twimg.com/a?format=png','state':'complete','post_ids':['1','2'],'kind':'image'},{'path':'media/v.mp4','url':'https://video.twimg.com/v.mp4','state':'skipped','post_ids':['1'],'kind':'video'}]},'posts':[{'id':'1','author':'demo','text':'=formula,\nnew line','quoted_id':'2','metrics':{'likes':0,'views':None},'media':[]},{'id':'2','author':'demo','text':'Original','media':[]}]};s=p/'snapshot.json';s.write_text(json.dumps(data));return s
 def test_csv_and_per_post_media_and_skipped(self):
  with tempfile.TemporaryDirectory() as d:
   p=pathlib.Path(d);source=self.fixture(p);out=p/'dataset';result=m.build(source,out)
   with (out/'posts.csv').open(encoding='utf-8-sig',newline='') as f:rows=list(csv.DictReader(f))
   self.assertEqual(rows[0]['text'],"'=formula,\nnew line");self.assertEqual(rows[0]['likes'],'0');self.assertEqual(rows[0]['views'],'');self.assertEqual(rows[0]['quote_relationship'],'self');self.assertEqual(rows[1]['role'],'context')
   for row in rows:
    for media in json.loads(row['media_paths']):self.assertTrue((out/media).is_file());self.assertIn('/'+row['post_id']+'/',media)
   self.assertEqual(result['media_states']['skipped'],1);self.assertEqual(result['issues'],[])
 def test_paths_rejected_before_output(self):
  with tempfile.TemporaryDirectory() as d:
   p=pathlib.Path(d);s=self.fixture(p);data=json.loads(s.read_text());data['manifest']['media'][0]['path']='../secret';s.write_text(json.dumps(data))
   with self.assertRaises(ValueError):m.build(s,p/'dataset')
   self.assertFalse((p/'dataset').exists())
 def test_unknown_duration_and_size_tradeoff(self):
  data={'manifest':{'media':[]},'posts':[{'id':'1','media':[{'video_url':'https://video.twimg.com/a.mp4','duration_ms':1800000,'variants':[{'content_type':'video/mp4','bitrate':8000000,'url':'https://video.twimg.com/a.mp4'},{'content_type':'video/mp4','bitrate':1000000,'url':'https://video.twimg.com/b.mp4'}]},{'video_url':'https://video.twimg.com/unknown.mp4'}]}]}
  best=m.estimate(data,'best');balanced=m.estimate(data,'balanced');self.assertGreater(best['estimated_total_mib'],balanced['estimated_total_mib']);self.assertEqual(best['video_sizes_unknown'],1);self.assertEqual(best['long_videos_over_5min'],1)
if __name__=='__main__':unittest.main()
