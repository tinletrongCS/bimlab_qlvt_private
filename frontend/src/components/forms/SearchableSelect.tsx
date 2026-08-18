import React, {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { FiChevronDown } from "react-icons/fi";

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  value?: string;
  onChange: (value: string) => void;
  options?: SearchableSelectOption[];
  children?: ReactNode;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  dropdownClassName?: string;
  portal?: boolean;
  style?: React.CSSProperties;
}

function rawOptionText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(rawOptionText).join("");
  if (React.isValidElement<{ children?: ReactNode }>(node))
    return rawOptionText(node.props.children);
  return "";
}

function optionText(node: ReactNode): string {
  return rawOptionText(node).replace(/\s+/g, " ").trim();
}

export function SearchableSelect({
  value,
  onChange,
  options = [],
  children,
  placeholder = "Không chọn",
  disabled = false,
  className = "",
  dropdownClassName = "",
  portal = false,
  style,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [portalStyle, setPortalStyle] = useState<CSSProperties>();

  const mergedOptions = [...options];

  if (children) {
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && child.type === "option") {
        mergedOptions.push({
          value: String((child as any).props.value || ""),
          label: optionText((child as any).props.children),
        });
      } else if (React.isValidElement(child) && child.type === React.Fragment) {
        React.Children.forEach((child as any).props.children, (fragChild: unknown) => {
          if (React.isValidElement(fragChild) && fragChild.type === "option") {
            mergedOptions.push({
              value: String((fragChild as any).props.value || ""),
              label: optionText((fragChild as any).props.children),
            });
          }
        });
      }
    });
  }

  const selectedOption = mergedOptions.find((o) => String(o.value) === String(value));
  const displayValue = open ? search : selectedOption ? selectedOption.label : "";

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useLayoutEffect(() => {
    if (!open || !portal) return;
    const positionDropdown = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const openUpwards = spaceBelow < 360 && rect.top > spaceBelow;
      const width = Math.min(Math.max(rect.width, 380), window.innerWidth - 16);
      setPortalStyle({
        position: "fixed",
        left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
        top: openUpwards ? undefined : rect.bottom + 4,
        bottom: openUpwards ? window.innerHeight - rect.top + 4 : undefined,
        width,
        maxHeight: Math.max(160, Math.min(360, openUpwards ? rect.top - 8 : spaceBelow)),
        overflowY: "auto",
        zIndex: 20000,
      });
    };
    positionDropdown();
    window.addEventListener("resize", positionDropdown);
    window.addEventListener("scroll", positionDropdown, true);
    return () => {
      window.removeEventListener("resize", positionDropdown);
      window.removeEventListener("scroll", positionDropdown, true);
    };
  }, [open, portal]);

  const filteredOptions = mergedOptions.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase()),
  );

  const handleToggle = () => {
    if (disabled) return;
    if (open) {
      setOpen(false);
      setSearch("");
    } else {
      setOpen(true);
      setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0);
    }
  };

  const dropdown = (
    <div
      className={`searchable-select-dropdown ${dropdownClassName}`}
      style={portal ? portalStyle : undefined}
    >
      {filteredOptions.length > 0 ? (
        filteredOptions.map((o) => (
          <div
            key={o.value}
            className={`searchable-select-option ${String(o.value) === String(value) ? "selected" : ""}`}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onChange(o.value);
              setOpen(false);
              setSearch("");
            }}
          >
            {o.label || "Không chọn"}
          </div>
        ))
      ) : (
        <div className="searchable-select-empty">Không tìm thấy</div>
      )}
    </div>
  );

  return (
    <div
      className={`searchable-select-container${disabled ? " is-disabled" : ""} ${className}`}
      ref={containerRef}
      style={style}
    >
      <div
        className="searchable-select-input-wrapper"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleToggle();
        }}
      >
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          className="searchable-select-input"
          value={displayValue}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!open) setOpen(true);
          }}
          onMouseDown={(e) => {
            // Let the parent wrapper handle toggle, but allow text selection when open
            if (!open) {
              e.preventDefault();
              e.stopPropagation();
              handleToggle();
            } else if (document.activeElement === inputRef.current && search === "") {
              // If already open and focused, and search is empty, clicking again closes it
              e.preventDefault();
              e.stopPropagation();
              handleToggle();
            } else {
              e.stopPropagation();
            }
          }}
          disabled={disabled}
          placeholder={selectedOption ? selectedOption.label : placeholder}
        />
        <FiChevronDown className={`searchable-select-icon${open ? " rotated" : ""}`} />
      </div>
      <select
        aria-hidden="true"
        className="searchable-select-native"
        tabIndex={-1}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {mergedOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {open &&
        !disabled &&
        (!portal || portalStyle) &&
        (portal ? createPortal(dropdown, document.body) : dropdown)}
    </div>
  );
}
