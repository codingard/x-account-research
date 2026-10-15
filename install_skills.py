#!/usr/bin/env python3
"""Install this checkout's agent skills and record its location; standard library only."""
import argparse
import os
from pathlib import Path
import shutil

NAMES = ('x-post-download', 'x-account-analysis', 'x-account-analysis-review')


def install(destination, update=False, codex=False):
    root = Path(__file__).resolve().parent
    destination = Path(destination).expanduser().resolve()
    targets = [destination / name for name in NAMES]
    if not update:
        existing = [str(path) for path in targets if path.exists()]
        if existing:
            raise FileExistsError('Skills already exist; inspect them before using --update: ' + ', '.join(existing))
    for name, target in zip(NAMES, targets):
        for relative in (('SKILL.md', 'agents/openai.yaml') if codex else ('SKILL.md',)):
            output = target / relative
            output.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(root / 'skills' / name / relative, output)
        (target / 'repository-path.txt').write_text(str(root) + '\n', encoding='utf-8')
        print(target)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--destination', type=Path, help='Skill directory supported by your client')
    parser.add_argument('--codex', action='store_true', help='Include Codex UI metadata; default destination is its skills directory')
    parser.add_argument('--update', action='store_true', help='Replace maintained skill files and checkout pointer; preserve other files')
    args = parser.parse_args()
    if args.destination is None and not args.codex:
        parser.error('Choose --destination for your client, or --codex for the optional Codex adapter')
    destination = args.destination or Path(os.environ.get('CODEX_HOME', str(Path.home() / '.codex'))) / 'skills'
    install(destination, args.update, args.codex)
