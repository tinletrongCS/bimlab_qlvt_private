import sys
import codecs
sys.stdout = codecs.getwriter('utf8')(sys.stdout.buffer)

file_path = r'D:\BIMLAB\bimlab_qlvt\frontend\src\pages\LoginPage.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

import re
match = re.search(r'<img[^>]*>', content)
if match:
    start = max(0, match.start() - 200)
    end = min(len(content), match.end() + 200)
    print(content[start:end])
else:
    print("No img found")
