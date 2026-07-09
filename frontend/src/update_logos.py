import sys
import codecs
sys.stdout = codecs.getwriter('utf8')(sys.stdout.buffer)

file_path = r'D:\BIMLAB\bimlab_qlvt\frontend\src\styles\app.css'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Replace src in AppShell.tsx
appshell_path = r'D:\BIMLAB\bimlab_qlvt\frontend\src\layout\AppShell.tsx'
with open(appshell_path, 'r', encoding='utf-8') as f:
    appshell_content = f.read()

appshell_content = appshell_content.replace(
    'src="/lgBL.ico"',
    'src="/simple.png"'
)
appshell_content = appshell_content.replace(
    'src="https://bimlab.com.vn/assets/img/bimlab-logo.png"',
    'src="/full_dark.png"'
)

with open(appshell_path, 'w', encoding='utf-8') as f:
    f.write(appshell_content)

# Replace src in LoginPage.tsx
login_path = r'D:\BIMLAB\bimlab_qlvt\frontend\src\pages\LoginPage.tsx'
with open(login_path, 'r', encoding='utf-8') as f:
    login_content = f.read()

login_content = login_content.replace(
    'src="https://bimlab.com.vn/assets/img/bimlab-logo.png"',
    'src="/full_dark.png"'
)

with open(login_path, 'w', encoding='utf-8') as f:
    f.write(login_content)

# Fix app.css
content = re.sub(r'background:\s*#ffffff\s*!important;', 'background: transparent !important;', content)
# Wait, this might affect other things. Let's be more specific.

