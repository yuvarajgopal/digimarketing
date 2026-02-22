"use client";

import { useState } from "react";
import { Search, Check, Image as ImageIcon, Film } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { type AssetType } from "@prisma/client";

export interface AssetInfo {
  url: string;
  type: string;
  name: string;
}

interface AssetPickerProps {
  type?: AssetType;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onAssetData?: (id: string, info: AssetInfo) => void;
  clientId?: string;
}

export function AssetPicker({ type, selectedIds, onSelectionChange, onAssetData, clientId }: AssetPickerProps) {
  const [search, setSearch] = useState("");

  const { data, isLoading } = trpc.asset.list.useQuery({
    ...(type ? { type } : {}),
    search: search || undefined,
    limit: 50,
    clientId,
  });

  const toggleAsset = (asset: { id: string; url: string; type: string; name: string; thumbnailUrl?: string | null }) => {
    if (selectedIds.includes(asset.id)) {
      onSelectionChange(selectedIds.filter((a) => a !== asset.id));
    } else {
      onSelectionChange([...selectedIds, asset.id]);
      onAssetData?.(asset.id, { url: asset.thumbnailUrl || asset.url, type: asset.type, name: asset.name });
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={type ? `Search ${type.toLowerCase()}s...` : "Search assets..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>
      <ScrollArea className="h-[200px] rounded-md border p-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Loading assets...
          </div>
        ) : !data?.assets.length ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            No {type ? `${type.toLowerCase()}s` : "assets"} found
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {data.assets.map((asset) => {
              const isSelected = selectedIds.includes(asset.id);
              return (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => toggleAsset(asset)}
                  className={cn(
                    "relative flex flex-col items-center gap-1 rounded-md border p-2 text-xs transition-colors hover:bg-accent",
                    isSelected && "border-primary bg-primary/5"
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                  {asset.type === "VIDEO" ? (
                    <Film className="h-8 w-8 text-muted-foreground" />
                  ) : (
                    asset.thumbnailUrl || asset.url ? (
                      <img
                        src={asset.thumbnailUrl || asset.url}
                        alt={asset.name}
                        className="h-8 w-8 rounded object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    )
                  )}
                  <span className="truncate w-full text-center">{asset.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
      {selectedIds.length > 0 && (
        <p className="text-xs text-muted-foreground">{selectedIds.length} selected</p>
      )}
    </div>
  );
}
