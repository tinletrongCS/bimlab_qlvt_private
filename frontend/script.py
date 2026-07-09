import sys

path = r'D:\BIMLAB\bimlab_qlvt\frontend\src\pages\AssetCategoriesPage.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add StatusBadge import
if 'StatusBadge' not in content:
    content = content.replace('import { PanelHeader } from "../components/PanelHeader";', 'import { PanelHeader } from "../components/PanelHeader";\nimport { StatusBadge } from "../components/StatusBadge";')

# 2. Add tree render function
tree_func = '''
function renderImportPreviewTree(rows: AssetCategoryImportRowPayload[]) {
  const byCode = new Map<string, any>();
  const roots: any[] = [];
  
  rows.forEach((row) => {
    if (row.code) {
      byCode.set(row.code.trim().toUpperCase(), { ...row, children: [] });
    }
  });
  
  rows.forEach((row) => {
    if (!row.code) return;
    const node = byCode.get(row.code.trim().toUpperCase());
    if (row.parentCode) {
      const pCode = row.parentCode.trim().toUpperCase();
      if (byCode.has(pCode)) {
        byCode.get(pCode).children.push(node);
        return;
      }
    }
    roots.push(node);
  });

  const renderNode = (node: any, depth = 0) => (
    <div key={node.code} className="category-structure-row">
      <div className="category-structure-row-head" style={{ paddingLeft: `${depth * 20 + 12}px`, cursor: 'default' }}>
        {node.children.length > 0 ? (
          <span className="category-arrow open">▶</span>
        ) : (
          <span className="category-arrow-spacer" />
        )}
        <span className="category-structure-title" style={{ flex: 1, fontFamily: "inherit" }}>{node.name}</span>
        <span className="category-structure-count">{node.code}</span>
      </div>
      {node.children.length > 0 && (
        <div className="category-structure-row-body" style={{ display: 'block' }}>
          {node.children.map((child: any) => renderNode(child, depth + 1))}
        </div>
      )}
    </div>
  );

  return (
    <>
      {roots.map(root => renderNode(root))}
    </>
  );
}
'''
if 'renderImportPreviewTree' not in content:
    content = content.replace('export function AssetCategoriesPage() {', tree_func + '\nexport function AssetCategoriesPage() {')

# 3. Add importPreviewTab state
if 'importPreviewTab' not in content:
    content = content.replace(
        'const [importPreviewFilter, setImportPreviewFilter] = useState<',
        'const [importPreviewTab, setImportPreviewTab] = useState<"TABLE" | "TREE">("TABLE");\n  const [importPreviewFilter, setImportPreviewFilter] = useState<'
    )

if 'setImportPreviewTab("TABLE");' not in content:
    content = content.replace(
        'setImportPreview(emptyCategoryImportResult(rows));',
        'setImportPreview(emptyCategoryImportResult(rows));\n      setImportPreviewTab("TABLE");'
    )


# Now use regular expressions to reliably replace blocks despite indentation differences.
import re

# 4. Replace asset-import-options content
content = re.sub(
    r'<div className="asset-import-options">[\s]*</div>',
    '''<div className="asset-import-options">
                    {importPreview?.uploadStatus === "VALID" && (
                      <div className="asset-import-tabs" style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          type="button" 
                          style={{ padding: '4px 12px', fontSize: '11px', fontFamily: 'inherit', background: importPreviewTab === 'TABLE' ? '#e0f2fe' : 'transparent', border: 'none', color: importPreviewTab === 'TABLE' ? '#0369a1' : '#6b7280', borderRadius: '4px', fontWeight: importPreviewTab === 'TABLE' ? 500 : 400, cursor: 'pointer' }}
                          onClick={() => setImportPreviewTab("TABLE")}
                        >
                          Danh sách dòng
                        </button>
                        <button 
                          type="button" 
                          style={{ padding: '4px 12px', fontSize: '11px', fontFamily: 'inherit', background: importPreviewTab === 'TREE' ? '#e0f2fe' : 'transparent', border: 'none', color: importPreviewTab === 'TREE' ? '#0369a1' : '#6b7280', borderRadius: '4px', fontWeight: importPreviewTab === 'TREE' ? 500 : 400, cursor: 'pointer' }}
                          onClick={() => setImportPreviewTab("TREE")}
                        >
                          Phân cấp cha con
                        </button>
                      </div>
                    )}
                  </div>''',
    content,
    flags=re.MULTILINE
)

# 5. Conditionally hide toolbar
content = re.sub(
    r'(<div className="asset-import-preview-toolbar">)',
    r'{importPreviewTab === "TABLE" && (\n                  \1',
    content
)

# Add closing tag for toolbar. 
# The toolbar ends right before <div className="asset-import-preview">
content = re.sub(
    r'(</div>\n\s*</div>\n\s*)(<div className="asset-import-preview">)',
    r'\1  )}\n                \2',
    content
)

# 6. Conditionally render table or tree inside asset-import-preview
content = re.sub(
    r'(<div className="asset-import-preview">\n\s*)(<table>)',
    r'''\1{importPreviewTab === "TREE" ? (
                    <div className="category-structure-rows" style={{ padding: '12px' }}>
                      {renderImportPreviewTree(importRows)}
                    </div>
                  ) : (
                  \2''',
    content
)

content = re.sub(
    r'(</tbody>\n\s*</table>\n\s*)(</div>)',
    r'\1  )}\n                \2',
    content
)

# 7. Use StatusBadge
content = re.sub(
    r'<span className="asset-import-row-status">[\s]*\{importStatusLabel\(status\)\}[\s]*</span>',
    '<StatusBadge value={status} label={importStatusLabel(status)} />',
    content,
    flags=re.MULTILINE
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Modified successfully!")
