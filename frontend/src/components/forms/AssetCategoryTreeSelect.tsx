import { type MouseEvent, useEffect, useState } from "react";
import { FiChevronDown, FiChevronRight, FiFileText, FiFolder } from "react-icons/fi";
import { loadAssetCategoryTree } from "../../services/api";
import type { AssetCategoryTree } from "../../services/types";

interface AssetCategoryTreeSelectProps {
  value: string;
  onChange: (value: string, code?: string) => void;
  label?: string;
  required?: boolean;
  categoryCode?: string;
  onCodeChange?: (code: string) => void;
}

export function AssetCategoryTreeSelect({
  value,
  onChange,
  label,
  required,
  categoryCode,
  onCodeChange,
}: AssetCategoryTreeSelectProps) {
  const [tree, setTree] = useState<AssetCategoryTree[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [savedExpandedIds, setSavedExpandedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssetCategoryTree()
      .then(setTree)
      .catch(() => setTree([]))
      .finally(() => setLoading(false));
  }, []);

  const toggleExpand = (e: MouseEvent, id: number) => {
    e.stopPropagation();
    e.preventDefault();
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelect = (node: AssetCategoryTree) => {
    if (!node.children || node.children.length === 0) {
      // Leaf node - fill both name and code
      onChange(node.name, node.code);
      if (onCodeChange) onCodeChange(node.code);
    } else {
      // Parent — toggle expand
      setExpandedIds((current) => {
        const next = new Set(current);
        if (next.has(node.id)) next.delete(node.id);
        else next.add(node.id);
        return next;
      });
    }
  };

  const renderNode = (node: AssetCategoryTree, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);
    const isLeaf = !hasChildren;
    const isSelected = value === node.name;

    return (
      <div key={node.id} className="category-tree-node-wrapper">
        <div
          className={
            "category-tree-node" +
            (isExpanded ? " expanded" : "") +
            (isLeaf ? " leaf" : " parent") +
            (isSelected ? " selected" : "")
          }
          style={{ paddingLeft: `${level * 16 + 12}px` }}
          onClick={() => handleSelect(node)}
        >
          {hasChildren ? (
            <button
              type="button"
              className="tree-expander"
              onClick={(e) => toggleExpand(e, node.id)}
            >
              {isExpanded ? <FiChevronDown /> : <FiChevronRight />}
            </button>
          ) : (
            <span className="tree-leaf-spacer" />
          )}
          <span className="tree-icon">{hasChildren ? <FiFolder /> : <FiFileText />}</span>
          <div
            className="tree-text-content"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "2px",
              alignItems: "flex-start",
              marginLeft: "4px",
              overflow: "hidden",
            }}
          >
            <span
              className="tree-label"
              style={{
                fontWeight: 700,
                color: "#1f2937",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "100%",
              }}
              title={node.name}
            >
              {node.name}
            </span>
            <span
              className="tree-code"
              style={{
                fontSize: "10.5px",
                color: "#64748b",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "100%",
              }}
              title={node.code}
            >
              {node.code}
            </span>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div className="category-tree-children">
            {node.children.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="form-field category-tree-select-container">
      {label && (
        <label className="form-label-text">
          {label} {required && <span className="form-required">*</span>}
        </label>
      )}
      <div className="category-tree-selected-row">
        <div
          className="category-tree-input-inline"
          style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
          title={value || ""}
        >
          {value || <span style={{ color: "#94a3b8" }}>Chọn danh mục ở bên dưới...</span>}
        </div>
        {categoryCode && (
          <div
            className="category-tree-code-inline"
            style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
            title={categoryCode}
          >
            {categoryCode}
          </div>
        )}
      </div>
      <div className="category-tree-inline-box">
        {loading ? (
          <div className="category-tree-loading">Đang tải...</div>
        ) : tree.length > 0 ? (
          <div className="category-tree-list">{tree.map((root) => renderNode(root, 0))}</div>
        ) : (
          <div className="category-tree-empty">Không có danh mục</div>
        )}
      </div>
    </div>
  );
}
