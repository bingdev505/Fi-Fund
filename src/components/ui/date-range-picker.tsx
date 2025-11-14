
"use client"

import * as React from "react"
import { addDays, format, startOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"

interface DateRangePickerProps extends React.ComponentProps<"div"> {
    date: DateRange | undefined;
    onDateChange: (date: DateRange | undefined) => void;
}

export function DateRangePicker({
  className,
  date,
  onDateChange
}: DateRangePickerProps) {

  const handlePresetChange = (value: string) => {
    const now = new Date();
    switch (value) {
      case "today":
        onDateChange({ from: now, to: now });
        break;
      case "last7":
        onDateChange({ from: addDays(now, -6), to: now });
        break;
      case "last30":
        onDateChange({ from: addDays(now, -29), to: now });
        break;
      case "this_month":
        onDateChange({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      case "this_year":
        onDateChange({ from: startOfYear(now), to: endOfYear(now) });
        break;
      default:
        onDateChange(undefined);
    }
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex p-2">
            <div className="pr-4 border-r">
                <h4 className="text-sm font-medium mb-2 px-2">Presets</h4>
                <div className="flex flex-col gap-1">
                    <Button variant="ghost" className="justify-start" onClick={() => handlePresetChange("today")}>Today</Button>
                    <Button variant="ghost" className="justify-start" onClick={() => handlePresetChange("last7")}>Last 7 Days</Button>
                    <Button variant="ghost" className="justify-start" onClick={() => handlePresetChange("last30")}>Last 30 Days</Button>
                    <Button variant="ghost" className="justify-start" onClick={() => handlePresetChange("this_month")}>This Month</Button>
                    <Button variant="ghost" className="justify-start" onClick={() => handlePresetChange("this_year")}>This Year</Button>
                </div>
            </div>
            <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={onDateChange}
                numberOfMonths={2}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
