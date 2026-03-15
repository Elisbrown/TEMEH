
"use client"

import { Button } from "@/components/ui/button"
import { Delete, DeleteIcon, Eraser, X } from "lucide-react"

interface NumericKeypadProps {
  onInput: (value: string) => void
  onClear: () => void
  onDelete: () => void
}

export function NumericKeypad({ onInput, onClear, onDelete }: NumericKeypadProps) {
  const keys = [
    "1", "2", "3",
    "4", "5", "6",
    "7", "8", "9",
    "0", ".", "C"
  ]

  const handleKeyClick = (key: string) => {
    if (key === "C") {
      onClear()
    } else {
      onInput(key)
    }
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {keys.map((key) => (
        <Button
          key={key}
          variant="outline"
          className="h-12 text-lg font-bold"
          onClick={() => handleKeyClick(key)}
        >
          {key}
        </Button>
      ))}
      <Button
        variant="outline"
        className="h-12 text-lg font-bold col-span-1"
        onClick={onDelete}
      >
        <Delete className="h-5 w-5" />
      </Button>
    </div>
  )
}
