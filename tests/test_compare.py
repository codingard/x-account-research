import importlib.util
import pathlib
import unittest
spec=importlib.util.spec_from_file_location('compare',pathlib.Path(__file__).parents[1]/'compare.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

class CompareTests(unittest.TestCase):
    def test_common_ids_separate_window_changes_and_missing_fields(self):
        def snapshot(ids,seconds):
            return {'manifest':{'selected':ids,'collected_at':'2026-10-01T00:00:00Z','finished_at':f'2026-10-01T00:00:{seconds:02}Z','details':[],'media':[],'errors':[]},'posts':[{'id':i,'author':'demo','text':'full','metrics':{'views':0},'media':[{'id':'image'}]} for i in ids]}
        a=snapshot(['1','2'],20);b=snapshot(['2','3'],10)
        b['posts'][0]['text']='fu';b['posts'][0]['media']=[];b['posts'][0]['metrics']={}
        r=module.compare(a,b)
        self.assertEqual(r['common_roots'],1)
        self.assertEqual(r['only_before_roots'],['1'])
        self.assertEqual(r['after']['seconds'],10)
        self.assertEqual(r['root_comparison'][0]['missing_metric_fields'],['views'])
        self.assertEqual(r['root_comparison'][0]['missing_media_ids'],['image'])
