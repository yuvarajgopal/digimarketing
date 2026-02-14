"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface DateRangePickerProps {
  from?: Date;
  to?: Date;
  onSelect: (range: { from: Date; to: Date }) => void;
  className?: string;
}

export function DateRangePicker({ from, to, onSelect, className }: DateRangePickerProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button variant="outline" className="justify-start text-left font-normal">
        <CalendarIcon className="mr-2 h-4 w-4" />
        {from ? (
          to ? (
            <>
              {format(from, "LLL dd, y")} - {format(to, "LLL dd, y")}
            </>
          ) : (
            format(from, "LLL dd, y")
          )
        ) : (
          <span>Pick a date range</span>
        )}
      </Button>
    </div>
  );
}
