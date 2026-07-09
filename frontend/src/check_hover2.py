import sys
import codecs
sys.stdout = codecs.getwriter('utf8')(sys.stdout.buffer)

file_path = r'D:\BIMLAB\bimlab_qlvt\frontend\src\styles\app.css'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

import re
matches = re.finditer(r'\.brand-compact-mark:hover\s*\{[^}]*\}', content)
for m in matches:
    print(m.group(0))
