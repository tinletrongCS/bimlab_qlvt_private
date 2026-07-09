import React, { type ReactNode, useEffect, useRef, useState } from "react";
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
  style?: React.CSSProperties;
}

export function SearchableSelect({
  value,
  onChange,
  options = [],
  children,
  placeholder = "Không chọn",
  disabled = false,
  className = "",
  style,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const mergedOptions = [...options];

  if (children) {
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && child.type === "option") {
        mergedOptions.push({
          value: String((child as any).props.value || ""),
          label: String((child as any).props.children || ""),
        });
      } else if (React.isValidElement(child) && child.type === React.Fragment) {
        React.Children.forEach((child as any).props.children, (fragChild: unknown) => {
          if (React.isValidElement(fragChild) && fragChild.type === "option") {
            mergedOptions.push({
              value: String((fragChild as any).props.value || ""),
              label: String((fragChild as any).props.children || ""),
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
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  return (
    <div className={`searchable-select-container ${className}`} ref={containerRef} style={style}>
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
      {open && !disabled && (
        <div className="searchable-select-dropdown">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((o) => (
              <div
                key={o.value}
                className={
                  "searchable-select-option " +
                  (String(o.value) === String(value) ? "selected" : "")
                }
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
      )}
    </div>
  );
}
