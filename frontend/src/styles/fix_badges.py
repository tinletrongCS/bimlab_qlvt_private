import sys
import codecs
sys.stdout = codecs.getwriter('utf8')(sys.stdout.buffer)
import re

file_path = r'D:\BIMLAB\bimlab_qlvt\frontend\src\styles\app.css'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# I will append extremely high specificity rules at the very end of app.css
# to ensure they override EVERYTHING else.

append_css = """
/* FORCE STATUS COLORS ACROSS ALL TABLES */
#root .badge.badge-in_stock,
#root .badge.badge-confirmed,
#root .badge.badge-approved {
  color: #2563eb !important;
  background: transparent !important;
  font-weight: 700 !important;
}

#root .badge.badge-assigned,
#root .badge.badge-in_use,
#root .badge.badge-active {
  color: #16a34a !important;
  background: transparent !important;
  font-weight: 700 !important;
}

#root .badge.badge-maintenance,
#root .badge.badge-pending,
#root .badge.badge-pending_approval,
#root .badge.badge-draft {
  color: #f59e0b !important;
  background: transparent !important;
  font-weight: 700 !important;
}

#root .badge.badge-disposed,
#root .badge.badge-liquidated,
#root .badge.badge-rejected,
#root .badge.badge-cancelled,
#root .badge.badge-expired,
#root .badge.badge-has_error,
#root .badge.badge-invalid {
  color: #ef4444 !important;
  background: transparent !important;
  font-weight: 700 !important;
}

#root .badge.badge-completed,
#root .badge.badge-inactive,
#root .badge.badge-unknown {
  color: #64748b !important;
  background: transparent !important;
  font-weight: 700 !important;
}
"""

# Let's remove the old conflicting rules to avoid bloat.
# Specifically the old .badge-blue block and other #root .badge-in_stock blocks I added earlier.
content = re.sub(r'\.badge-in_stock,\s*#root \.badge-confirmed,\s*#root \.badge-approved\s*\{.*?\}', '', content, flags=re.DOTALL)
content = re.sub(r'\.badge-assigned,\s*#root \.badge-in_use,\s*#root \.badge-active\s*\{.*?\}', '', content, flags=re.DOTALL)
content = re.sub(r'\.badge-maintenance,\s*#root \.badge-pending,\s*#root \.badge-pending_approval,\s*#root \.badge-draft\s*\{.*?\}', '', content, flags=re.DOTALL)
content = re.sub(r'\.badge-disposed,\s*#root \.badge-liquidated,\s*#root \.badge-rejected,\s*#root \.badge-cancelled,\s*#root \.badge-expired\s*\{.*?\}', '', content, flags=re.DOTALL)
content = re.sub(r'\.badge-completed\s*\{.*?\}', '', content, flags=re.DOTALL)
content = re.sub(r'\.badge-inactive\s*\{.*?\}', '', content, flags=re.DOTALL)
content = re.sub(r'\.badge-blue,\s*#root \.badge-primary,\s*#root\s*\.asset-table\s*\.badge:not\(\.text-red-500\):not\(\.text-amber-500\):not\(\.text-green-500\):not\(\.text-gray-500\)\s*\{.*?\}', '', content, flags=re.DOTALL)
content = re.sub(r'\.badge-assigned\s*\{\s*color:\s*#[0-9a-fA-F]+\s*!important;\s*\}', '', content, flags=re.DOTALL)
content = re.sub(r'\.badge-disposed,\s*#root \.asset-table \.badge-liquidated\s*\{\s*color:\s*#[0-9a-fA-F]+\s*!important;\s*\}', '', content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content + append_css)

print("Updated app.css with forced badge colors")
