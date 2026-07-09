import sys
import codecs
sys.stdout = codecs.getwriter('utf8')(sys.stdout.buffer)

file_path = r'D:\BIMLAB\bimlab_qlvt\frontend\src\layout\AppShell.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

import re
match = re.search(r'<img src="/full_dark.png".*?</button>', content, flags=re.DOTALL)
if match:
    print(match.group(0))
