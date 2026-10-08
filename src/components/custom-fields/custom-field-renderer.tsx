"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CustomFieldRendererProps {
  field: {
    id: string;
    name: string;
    fieldKey: string;
    type: string;
    description?: string | null;
    options?: string[];
    isRequired?: boolean;
    value?: any;
  };
  value: any;
  onChange: (val: any) => void;
  disabled?: boolean;
}

export function CustomFieldRenderer({
  field,
  value,
  onChange,
  disabled = false,
}: CustomFieldRendererProps) {
  const renderInput = () => {
    switch (field.type) {
      case "TEXT":
      case "EMAIL":
      case "URL":
        return (
          <Input
            type={
              field.type === "EMAIL"
                ? "email"
                : field.type === "URL"
                  ? "url"
                  : "text"
            }
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={
              field.description || `Enter ${field.name.toLowerCase()}`
            }
          />
        );

      case "NUMBER":
        return (
          <Input
            type="number"
            value={value ?? ""}
            onChange={(e) =>
              onChange(e.target.value === "" ? "" : Number(e.target.value))
            }
            disabled={disabled}
            placeholder="0"
          />
        );

      case "DATE":
        return (
          <Input
            type="date"
            value={value ? new Date(value).toISOString().split("T")[0] : ""}
            onChange={(e) =>
              onChange(
                e.target.value ? new Date(e.target.value).toISOString() : null,
              )
            }
            disabled={disabled}
          />
        );

      case "CHECKBOX":
        return (
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id={field.id}
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
              disabled={disabled}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
            />
            <span className="text-xs text-muted-foreground">
              {field.description || "Enable"}
            </span>
          </div>
        );

      case "DROPDOWN":
        return (
          <select
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">-- Select {field.name} --</option>
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );

      default:
        return (
          <Input
            type="text"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
          />
        );
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label
          htmlFor={field.id}
          className="text-xs font-medium text-foreground"
        >
          {field.name}{" "}
          {field.isRequired && <span className="text-red-500">*</span>}
        </Label>
      </div>
      {renderInput()}
    </div>
  );
}
