import sys
import codecs
sys.stdout = codecs.getwriter('utf8')(sys.stdout.buffer)

file_path = r'D:\BIMLAB\bimlab_qlvt\frontend\src\styles\app.css'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Specifically replace the white background for brand images and brand-compact-mark
content = re.sub(
    r'\.brand\s+img\s*\{([^}]*)background:\s*#ffffff\s*!important;([^}]*)\}',
    r'.brand img {\1background: transparent !important;\2}',
    content
)

content = re.sub(
    r'\.brand-compact-mark\s*\{([^}]*)background:\s*#ffffff\s*!important;([^}]*)\}',
    r'.brand-compact-mark {\1background: transparent !important;\2}',
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated background for brand in app.css")
