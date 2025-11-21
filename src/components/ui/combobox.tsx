
"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

type ComboboxProps = {
    options: { value: string; label: string }[];
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    noResultsText?: string;
}

export function Combobox({ 
    options,
    value, 
    onChange,
    placeholder = "Select an option...",
    searchPlaceholder = "Search...",
    noResultsText = "No results found."
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  
  const handleSelect = (currentValue: string) => {
    onChange(currentValue === value ? "" : currentValue)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className="truncate">
            {value
              ? options.find((option) => option.value === value)?.label || value
              : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList cmdk-list-aria-label="Suggestions">
            <CommandEmpty>
                <div 
                    className="cursor-pointer p-2"
                    onSelect={() => {
                        const commandInput = document.querySelector('input[cmdk-input]');
                        if (commandInput) {
                            handleSelect((commandInput as HTMLInputElement).value);
                        }
                    }}
                    onClick={() => {
                         const commandInput = document.querySelector('input[cmdk-input]');
                        if (commandInput) {
                            handleSelect((commandInput as HTMLInputElement).value);
                        }
                    }}
                >
                    Create "{document.querySelector('input[cmdk-input]')?.getAttribute('value')}"
                </div>
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => handleSelect(option.value)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
