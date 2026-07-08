import sys
import codecs
sys.stdout = codecs.getwriter('utf8')(sys.stdout.buffer)

file_path = r'D:\BIMLAB\bimlab_qlvt\frontend\src\components\StatusBadge.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    print(f.read())
