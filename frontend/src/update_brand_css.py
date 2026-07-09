import sys
import codecs
sys.stdout = codecs.getwriter('utf8')(sys.stdout.buffer)

file_path = r'D:\BIMLAB\bimlab_qlvt\frontend\src\styles\app.css'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Remove the border and increase size slightly to make it crisp and "vuông vức"
content = re.sub(
    r'\.brand-compact-mark\s*\{([^}]*)border:\s*1px\s*solid\s*rgba[^;]+;([^}]*)\}',
    r'.brand-compact-mark {\1border: 0 !important;\2}',
    content
)

content = re.sub(
    r'\.brand-compact-mark\s*\{([^}]*)border-radius:\s*[^;]+;([^}]*)\}',
    r'.brand-compact-mark {\1border-radius: 0 !important;\2}',
    content
)

# Expand image inside brand-compact-mark to 34px
content = re.sub(
    r'(\.brand-compact-mark\s*img\s*\{[^}]*)width:\s*28px\s*!important;',
    r'\1width: 34px !important;',
    content
)
content = re.sub(
    r'(\.brand-compact-mark\s*img\s*\{[^}]*)max-width:\s*28px\s*!important;',
    r'\1max-width: 34px !important;',
    content
)
content = re.sub(
    r'(\.brand-compact-mark\s*img\s*\{[^}]*)height:\s*28px\s*!important;',
    r'\1height: 34px !important;',
    content
)
content = re.sub(
    r'(\.brand-compact-mark\s*img\s*\{[^}]*)max-height:\s*28px\s*!important;',
    r'\1max-height: 34px !important;',
    content
)

# Let's also adjust the main brand logo to allow a bit more height just in case full_dark is tall.
content = re.sub(
    r'(\.brand\s*img\s*\{[^}]*)max-height:\s*32px\s*!important;',
    r'\1max-height: 40px !important;',
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Adjusted CSS for compact logo squareness")
