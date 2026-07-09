import sys
import codecs
sys.stdout = codecs.getwriter('utf8')(sys.stdout.buffer)

file_path = r'D:\BIMLAB\bimlab_qlvt\frontend\src\styles\app.css'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("font-weight: 700 !important;", "font-weight: 600 !important;")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated font-weight to 600")
