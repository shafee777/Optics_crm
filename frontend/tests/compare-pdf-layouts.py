"""Compare every PDF page from pdf-layout.mjs using Poppler and Pillow.
Run from the repository root; PDFTOPPM can point to a bundled executable.
"""
import os
from pathlib import Path
import subprocess
from PIL import Image, ImageChops
from pypdf import PdfReader

root = Path('work/pdf-verification')
for pdf in root.glob('*.pdf'):
    subprocess.run([os.environ.get('PDFTOPPM', 'pdftoppm'), '-scale-to', '1400', '-png', str(pdf), str(pdf.with_suffix(''))], check=True)
for baseline, action in [('prescription-print', 'prescription-share'), ('invoice-print', 'invoice-download'), ('invoice-print', 'invoice-share')]:
    expected = sorted(root.glob(baseline + '-*.png'))
    actual = sorted(root.glob(action + '-*.png'))
    assert len(expected) == len(actual) > 0, (baseline, action, 'page counts differ')
    for first, second in zip(expected, actual):
        left, right = Image.open(first).convert('RGB'), Image.open(second).convert('RGB')
        assert left.size == right.size, (baseline, action, 'page sizes differ')
        assert ImageChops.difference(left, right).getbbox() is None, (baseline, action, 'rendered pages differ')
    assert [p.extract_text() for p in PdfReader(root / (baseline + '.pdf')).pages] == [p.extract_text() for p in PdfReader(root / (action + '.pdf')).pages]
    print(f'PASS: {action} matches {baseline}: {len(expected)} page(s), identical pixels and text')
