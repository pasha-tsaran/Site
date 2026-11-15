from pathlib import Path
import zipfile

root = Path(__file__).resolve().parents[1]
destination = root.parent / 'house-site-first-block.zip'
files = []
for directory in ('src', 'scripts', 'dist'):
    files.extend(p for p in (root / directory).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
files.extend(root / name for name in ('package.json', 'START.cmd', 'README.md', 'BRIEF.md', 'VIDEO_HANDOFF.md', 'QA.md'))
with zipfile.ZipFile(destination, 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in files:
        archive.write(path, 'house-site/' + path.relative_to(root).as_posix())
with zipfile.ZipFile(destination) as archive:
    assert archive.testzip() is None
    assert 'house-site/dist/assets/hero-scrub.mp4' in archive.namelist()
print(str(destination))
print(f'{destination.stat().st_size} bytes; {len(files)} files; ZIP verified')
