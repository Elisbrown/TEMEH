"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"
import { useTranslation } from "@/hooks/use-translation"
import { useLanguage } from "@/context/language-context"
import { fr, enUS } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function DateRangePicker({
  className,
  onDateRangeChange,
  initialDateRange,
}: React.HTMLAttributes<HTMLDivElement> & {
  onDateRangeChange?: (dateRange: DateRange | undefined) => void
  initialDateRange?: DateRange
}) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const dateLocale = language === 'fr' ? fr : enUS;

  const [date, setDate] = React.useState<DateRange | undefined>(
    initialDateRange || {
      from: new Date(new Date().setDate(new Date().getDate() - 30)),
      to: new Date(),
    }
  )

  // Update internal state when initialDateRange changes
  React.useEffect(() => {
    if (initialDateRange) {
      setDate(initialDateRange)
    }
  }, [initialDateRange])

  const handleDateChange = (newDate: DateRange | undefined) => {
    setDate(newDate)
    onDateRangeChange?.(newDate)
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            size="sm"
            className={cn(
              "w-[240px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y", { locale: dateLocale })} -{" "}
                  {format(date.to, "LLL dd, y", { locale: dateLocale })}
                </>
              ) : (
                format(date.from, "LLL dd, y", { locale: dateLocale })
              )
            ) : (
              <span>{t('dashboard.pickADate')}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleDateChange}
            numberOfMonths={2}
            locale={dateLocale}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
