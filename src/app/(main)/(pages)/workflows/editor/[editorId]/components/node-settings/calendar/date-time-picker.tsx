"use client";

import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { WEEKDAY_LABELS, formatDisplay } from "./date-grid";
import { useDateTimePicker } from "./use-date-time-picker";

export function DateTimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const picker = useDateTimePicker({ value, onChange });

  return (
    <Popover open={picker.open} onOpenChange={picker.handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              "h-8 w-full justify-start gap-2 text-xs font-normal",
              !picker.hasValue && "text-muted-foreground",
            )}
          />
        }
      >
        <CalendarIcon className="h-3.5 w-3.5" />
        {picker.hasValue ? formatDisplay(value) : "Pick date and time"}
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex items-center justify-between px-2 pt-2">
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Previous month"
            onClick={() => picker.shiftMonth(-1)}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs font-medium capitalize">{picker.label}</span>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Next month"
            onClick={() => picker.shiftMonth(1)}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 px-2 pt-2">
          {WEEKDAY_LABELS.map((day) => (
            <span key={day} className="text-center text-[10px] text-muted-foreground">
              {day.slice(0, 1)}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 p-2">
          {picker.grid.map((cell) => (
            <Button
              key={cell.iso}
              variant="ghost"
              size="icon-sm"
              aria-label={cell.iso}
              aria-pressed={cell.iso === picker.selectedDate}
              onClick={() => picker.selectDay(cell)}
              className={cn(
                "size-8 p-0 text-xs font-normal",
                !cell.inMonth && "text-muted-foreground/40",
                cell.isToday && "border border-ring",
                cell.iso === picker.selectedDate &&
                  "bg-primary text-primary-foreground hover:bg-primary/80",
              )}
            >
              {cell.day}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2 border-t p-2">
          <Input
            type="time"
            className="h-8 w-28 text-xs"
            value={picker.time}
            onChange={(event) => picker.changeTime(event.target.value)}
            aria-label="Time"
          />
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="xs" onClick={picker.goToday}>
              Today
            </Button>
            <Button variant="ghost" size="xs" onClick={picker.clear}>
              Clear
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
