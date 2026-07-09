import sys

path = r'D:\BIMLAB\bimlab_qlvt\frontend\src\pages\AssetCategoriesPage.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add StatusBadge import
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
        <span className="category-structure-title" style={{ flex: 1 }}>{node.name}</span>
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
    <div className="category-structure-rows" style={{ padding: '12px' }}>
      {roots.map(root => renderNode(root))}
    </div>
  );
}
'''
content = content.replace('export function AssetCategoriesPage() {', tree_func + '\nexport function AssetCategoriesPage() {')

# 3. Add importPreviewTab state
content = content.replace(
    'const [importPreviewFilter, setImportPreviewFilter] = useState<',
    'const [importPreviewTab, setImportPreviewTab] = useState<"TABLE" | "TREE">("TABLE");\n  const [importPreviewFilter, setImportPreviewFilter] = useState<'
)

# 4. Reset tab on file import
content = content.replace(
    'setImportPreview(emptyCategoryImportResult(rows));',
    'setImportPreview(emptyCategoryImportResult(rows));\n      setImportPreviewTab("TABLE");'
)

# 5. Add tabs UI and conditionally render table/tree
# We will replace the start of toolbar and the end of preview div.
toolbar_start = '<div className="asset-import-preview-toolbar">'
tabs_ui = '''
                  {importPreview?.uploadStatus === "VALID" && (
                    <div className="asset-import-tabs" style={{ display: 'flex', gap: '8px', marginBottom: '12px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
                      <button 
                        type="button" 
                        style={{ padding: '6px 12px', background: importPreviewTab === 'TABLE' ? '#e0f2fe' : 'transparent', border: 'none', color: importPreviewTab === 'TABLE' ? '#0369a1' : '#6b7280', borderRadius: '4px', fontWeight: importPreviewTab === 'TABLE' ? 500 : 400, cursor: 'pointer' }}
                        onClick={() => setImportPreviewTab("TABLE")}
                      >
                        Danh sách dòng
                      </button>
                      <button 
                        type="button" 
                        style={{ padding: '6px 12px', background: importPreviewTab === 'TREE' ? '#e0f2fe' : 'transparent', border: 'none', color: importPreviewTab === 'TREE' ? '#0369a1' : '#6b7280', borderRadius: '4px', fontWeight: importPreviewTab === 'TREE' ? 500 : 400, cursor: 'pointer' }}
                        onClick={() => setImportPreviewTab("TREE")}
                      >
                        Phân cấp cha con
                      </button>
                    </div>
                  )}
                  {importPreviewTab === "TREE" ? (
                    <div className="asset-import-preview tree-preview" style={{ background: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb', maxHeight: '400px', overflowY: 'auto' }}>
                      {renderImportPreviewTree(importRows)}
                    </div>
                  ) : (
                    <>
                      <div className="asset-import-preview-toolbar">
'''
content = content.replace(toolbar_start, tabs_ui)

table_end = '''                  </table>
                </div>'''
table_end_replacement = '''                  </table>
                </div>
                    </>
                  )
                }'''
content = content.replace(table_end, table_end_replacement)


# 6. Change status text to StatusBadge
status_td_old = '''                                {status ? (
                                  <span className="asset-import-row-status">
                                    {importStatusLabel(status)}
                                  </span>
                                ) : ('''
status_td_new = '''                                {status ? (
                                  <StatusBadge value={status} label={importStatusLabel(status)} />
                                ) : ('''
content = content.replace(status_td_old, status_td_new)


with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Modified successfully!")
