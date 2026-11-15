"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  buildMonthGrid,
  combine,
  monthLabel,
  parseLocalValue,
  toMonthKey,
  todayIso,
  type DayCell,
} from "./date-grid";

export function useDateTimePicker(input: { value: string; onChange: (value: string) => void }) {
  const parsed = parseLocalValue(input.value);
  const [visible, setVisible] = useState(() => toMonthKey(input.value || todayIso()));
  const [open, setOpen] = useState(false);

  const grid = useMemo(
    () => buildMonthGrid(visible.year, visible.month),
    [visible.year, visible.month],
  );
  const label = useMemo(() => monthLabel(visible.year, visible.month), [visible.year, visible.month]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) setVisible(toMonthKey(input.value || todayIso()));
  };

  const selectDay = (cell: DayCell) => {
    input.onChange(combine(cell.iso, parsed.time || "09:00"));
    setOpen(false);
  };

  const changeTime = (time: string) => {
    input.onChange(combine(parsed.date || todayIso(), time));
  };

  const goToday = () => {
    const iso = todayIso();
    input.onChange(combine(iso, parsed.time || "09:00"));
    setVisible(toMonthKey(iso));
  };

  const shiftMonth = (delta: number) => {
    setVisible((current) => addMonths(current.year, current.month, delta));
  };

  const clear = () => {
    input.onChange("");
    setOpen(false);
  };

  return {
    open,
    handleOpenChange,
    grid,
    label,
    shiftMonth,
    selectDay,
    changeTime,
    goToday,
    clear,
    time: parsed.time,
    selectedDate: parsed.date,
    hasValue: Boolean(input.value),
  };
}
