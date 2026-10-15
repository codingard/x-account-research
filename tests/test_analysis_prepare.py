import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('analysis_prepare', Path(__file__).resolve().parents[1] / 'analysis_prepare.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class AnalysisPreparationTest(unittest.TestCase):
    def fixture(self):
        return {'schema_version': 1, 'collector': 'browser-observed-v1', 'manifest': {
            'handle': 'demo', 'selected': ['1', '2'], 'finished_at': '2026-10-14T12:00:00Z',
            'details': [], 'remaining_gaps': [], 'stop_reason': 'period_reached'}, 'posts': [
                {'id': '1', 'author': 'demo', 'created_at': '2026-10-01T12:00:00Z', 'text': 'Old root', 'metrics': {'views': None, 'likes': 0}},
                {'id': '2', 'author': 'demo', 'created_at': '2026-10-14T00:00:00Z', 'observed_at': '2026-10-14T06:00:00Z', 'text': 'New root', 'metrics': {'views': 100, 'likes': 2}, 'quoted_id': '1'}]}

    def run_fixture(self, data, inspect):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            (base / 'snapshot.json').write_text(json.dumps(data))
            m.prepare(base, base / 'prepared')
            inspect(base / 'prepared')

    def test_missing_zero_unvisited_complete_roots(self):
        def inspect(output):
            stats = json.loads((output / 'statistics.json').read_text())
            self.assertEqual(stats['count'], 2)
            self.assertEqual(stats['metrics']['likes']['median'], 1)
            self.assertEqual(stats['metrics']['views']['n'], 1)
            self.assertEqual(stats['metrics']['views']['missing'], 1)
            coverage = json.loads((output / 'coverage.json').read_text())
            self.assertEqual(coverage['remaining_gaps'], [])
            self.assertNotIn('detail', json.dumps(coverage))
            self.assertIn('Old root', (output / 'corpus.md').read_text())
        self.run_fixture(self.fixture(), inspect)

    def test_selfquote_family_separate_counters(self):
        def inspect(output):
            graph = json.loads((output / 'quote-families.json').read_text())
            self.assertEqual(graph['edges'][0]['relationship'], 'self')
            self.assertEqual(graph['families'][0]['ids'], ['1', '2'])
            self.assertIsNone(graph['families'][0]['members'][0]['metrics']['views'])
            self.assertEqual(graph['families'][0]['members'][1]['metrics']['views'], 100)
            self.assertNotIn('total', json.dumps(graph))
        self.run_fixture(self.fixture(), inspect)

    def test_freshness_and_chronology_use_dates_not_ids(self):
        def inspect(output):
            stats = json.loads((output / 'statistics.json').read_text())
            self.assertEqual(stats['post_ages']['2']['age_hours_at_observation'], 6)
            self.assertTrue(stats['post_ages']['2']['fresh_under_24h'])
            self.assertEqual(stats['post_ages']['1']['observation_time_source'], 'collection')
            chronology = json.loads((output / 'chronology.json').read_text())
            self.assertEqual(chronology['ordered_root_ids'], ['1', '2'])
            self.assertEqual(chronology['early'], {'count': 1, 'ids': ['1']})
            self.assertEqual(chronology['late'], {'count': 1, 'ids': ['2']})
        data = self.fixture()
        data['posts'].reverse()
        self.run_fixture(data, inspect)

    def test_articles_media_missing_original_and_refuse_overwrite(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            data = self.fixture()
            data['posts'][0]['article'] = {'title': 'Title', 'text': 'Full article text'}
            data['posts'][1]['quoted_id'] = 'missing'
            (base / 'snapshot.json').write_text(json.dumps(data))
            (base / 'media.csv').write_text('post_id,local_path,status\n1,media/1.jpg,complete\n')
            (base / 'media').mkdir()
            (base / 'media/1.jpg').write_bytes(b'fixture')
            m.prepare(base, base / 'out')
            self.assertIn('Full article text', (base / 'out/corpus.md').read_text())
            index = json.loads((base / 'out/media-index.json').read_text())
            self.assertTrue(index[0]['local_file_exists'])
            graph = json.loads((base / 'out/quote-families.json').read_text())
            self.assertFalse(graph['edges'][0]['original_available'])
            with self.assertRaises(FileExistsError):
                m.prepare(base, base / 'out')
            (base / 'media.csv').write_text('post_id,local_path,status\n1,../outside.jpg,complete\n')
            with self.assertRaises(ValueError):
                m.prepare(base, base / 'unsafe')
            self.assertFalse((base / 'unsafe').exists())


if __name__ == '__main__':
    unittest.main()
