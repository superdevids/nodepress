"use client";

import * as React from "react";
import { Settings2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocalStorage } from "@/lib/hooks";
import { Separator } from "@/components/ui/separator";

interface Column {
  id: string;
  label: string;
  defaultVisible?: boolean;
}

interface ScreenOptionsProps {
  columns?: Column[];
  defaultPerPage?: number;
  onPerPageChange?: (value: number) => void;
  onColumnsChange?: (columns: string[]) => void;
}

interface ScreenOption {
  id: string;
  label: string;
  type: "toggle" | "select" | "number";
  defaultValue?: string | number | boolean;
  value?: string | number | boolean;
  options?: { label: string; value: string }[];
}

const registeredOptions = new Map<string, ScreenOption>();

export function registerScreenOption(option: ScreenOption) {
  registeredOptions.set(option.id, option);
}

export function ScreenOptions({
  columns = [],
  defaultPerPage = 20,
  onPerPageChange,
  onColumnsChange,
}: ScreenOptionsProps) {
  const [perPage, setPerPage] = useLocalStorage("nodepress_screen_per_page", defaultPerPage);
  const [visibleColumns, setVisibleColumns] = useLocalStorage<string[]>(
    "nodepress_screen_columns",
    columns.filter((c) => c.defaultVisible !== false).map((c) => c.id),
  );
  const [pluginOptions, setPluginOptions] = useLocalStorage<Record<string, string | number | boolean>>(
    "nodepress_screen_plugin_options",
    {},
  );

  const handlePerPageChange = (value: string) => {
    const num = parseInt(value, 10);
    setPerPage(num);
    onPerPageChange?.(num);
  };

  const toggleColumn = (columnId: string, checked: boolean) => {
    const next = checked
      ? [...visibleColumns, columnId]
      : visibleColumns.filter((id) => id !== columnId);
    setVisibleColumns(next);
    onColumnsChange?.(next);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <Settings2 className="h-4 w-4 mr-1.5" />
          Screen Options
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Pagination</DropdownMenuLabel>
        <div className="px-2 py-1.5">
          <div className="flex items-center gap-2">
            <Label className="text-xs w-20">Items per page:</Label>
            <Select
              value={String(perPage)}
              onValueChange={handlePerPageChange}
            >
              <SelectTrigger className="h-8 w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {columns.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Columns</DropdownMenuLabel>
            {columns.map((col) => (
              <DropdownMenuCheckboxItem
                key={col.id}
                checked={visibleColumns.includes(col.id)}
                onCheckedChange={(checked) => toggleColumn(col.id, checked)}
              >
                {col.label}
              </DropdownMenuCheckboxItem>
            ))}
          </>
        )}

        {Array.from(registeredOptions.entries()).length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Plugin Options</DropdownMenuLabel>
            {Array.from(registeredOptions.entries()).map(([id, option]) => (
              <div key={id} className="px-2 py-1.5">
                {option.type === "toggle" && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`so-${id}`}
                      checked={(pluginOptions[id] as boolean) ?? (option.defaultValue as boolean) ?? false}
                      onCheckedChange={(checked) =>
                        setPluginOptions((prev) => ({ ...prev, [id]: !!checked }))
                      }
                    />
                    <Label htmlFor={`so-${id}`} className="text-xs cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                )}
                {option.type === "select" && option.options && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs w-20">{option.label}:</Label>
                    <Select
                      value={String(pluginOptions[id] ?? option.defaultValue ?? "")}
                      onValueChange={(val) =>
                        setPluginOptions((prev) => ({ ...prev, [id]: val }))
                      }
                    >
                      <SelectTrigger className="h-8 flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {option.options.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {option.type === "number" && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs w-20">{option.label}:</Label>
                    <Input
                      type="number"
                      className="h-8 w-20"
                      value={String(pluginOptions[id] ?? option.defaultValue ?? "")}
                      onChange={(e) =>
                        setPluginOptions((prev) => ({ ...prev, [id]: parseInt(e.target.value, 10) || 0 }))
                      }
                    />
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
