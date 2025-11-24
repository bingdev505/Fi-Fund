
"use client"

import * as React from "react"
import { addDays, format, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useState } from "react"

interface DateRangePickerProps extends React.ComponentProps<"div"> {
    date: DateRange | undefined;
    onDateChange: (date: DateRange | undefined) => void;
}

export function DateRangePicker({
  className,
  date,
  onDateChange
}: DateRangePickerProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const [isOpen, setIsOpen] = useState(false);

  const handlePresetChange = (value: string) => {
    const now = new Date();
    let newDate: DateRange | undefined;
    switch (value) {
      case "today":
        newDate = { from: now, to: now };
        break;
      case "last7":
        newDate = { from: addDays(now, -6), to: now };
        break;
      case "last30":
        newDate = { from: addDays(now, -29), to: now };
        break;
      case "this_month":
        newDate = { from: startOfMonth(now), to: endOfMonth(now) };
        break;
      case "this_year":
        newDate = { from: startOfYear(now), to: endOfYear(now) };
        break;
      default:
        newDate = undefined;
    }
    onDateChange(newDate);
    setIsOpen(false);
  }

  const PickerButton = () => (
    <Button
        id="date"
        variant={"outline"}
        className={cn(
            "w-full justify-start text-left font-normal",
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
  );

  const handleSelect = (range: DateRange | undefined) => {
      onDateChange(range);
      if (range?.from && range?.to) {
        setIsOpen(false);
      }
  }

  const CalendarContent = () => (
    <div className={cn("flex flex-col md:flex-row", isDesktop ? "" : "p-4")}>
        <div className="flex flex-col p-2">
            <h4 className="text-sm font-medium mb-2 px-2">Presets</h4>
            <div className="flex flex-wrap md:flex-col gap-1">
                <Button variant="ghost" className="justify-start" onClick={() => handlePresetChange("today")}>Today</Button>
                <Button variant="ghost" className="justify-start" onClick={() => handlePresetChange("last7")}>Last 7 Days</Button>
                <Button variant="ghost" className="justify-start" onClick={() => handlePresetChange("last30")}>Last 30 Days</Button>
                <Button variant="ghost" className="justify-start" onClick={() => handlePresetChange("this_month")}>This Month</Button>
                <Button variant="ghost" className="justify-start" onClick={() => handlePresetChange("this_year")}>This Year</Button>
            </div>
        </div>
        <div className="p-2 md:border-l">
            <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={handleSelect}
                numberOfMonths={isDesktop ? 2 : 1}
            />
        </div>
    </div>
  );

  if (isDesktop) {
      return (
        <div className={cn("grid gap-2", className)}>
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <PickerButton />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 flex" align="start">
              <CalendarContent />
            </PopoverContent>
          </Popover>
        </div>
      );
  }

  return (
     <div className={cn("grid gap-2", className)}>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <PickerButton />
            </DialogTrigger>
            <DialogContent className="p-0 max-w-sm">
                <CalendarContent />
            </DialogContent>
        </Dialog>
     </div>
  )
}
