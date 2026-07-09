import sys
import codecs
sys.stdout = codecs.getwriter('utf8')(sys.stdout.buffer)

import os
import re

folder = r'D:\BIMLAB\bimlab_qlvt\frontend\src'
for root, _, files in os.walk(folder):
    for f in files:
        if f.endswith('.tsx') or f.endswith('.ts'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
            if 'lgBL.ico' in content or '<img' in content or 'logo' in content.lower():
                print(f"Found match in: {path}")
