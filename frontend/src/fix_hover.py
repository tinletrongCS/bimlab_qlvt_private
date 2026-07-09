import sys
import codecs
sys.stdout = codecs.getwriter('utf8')(sys.stdout.buffer)

file_path = r'D:\BIMLAB\bimlab_qlvt\frontend\src\styles\app.css'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Update .brand:hover background rules
content = re.sub(
    r'(\.brand:hover\s*\{[^}]*)background:\s*[^;]+;([^}]*\})',
    r'\1background: transparent !important;\2',
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated .brand:hover background to transparent")
