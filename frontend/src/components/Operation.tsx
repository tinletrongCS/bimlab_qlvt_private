import type { ReactElement } from "react";

interface OperationProps {
  icon: ReactElement;
  label: string;
  value: string | number;
}

export function Operation({ icon, label, value }: OperationProps) {
  return (
    <div className="operation-card">
      {icon}
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
