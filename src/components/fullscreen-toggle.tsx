"use client"

import { useState, useEffect, useCallback } from "react"
import { Maximize, Minimize } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function FullscreenToggle() {
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [isSupported, setIsSupported] = useState(true)

    useEffect(() => {
        // Check if fullscreen is supported
        setIsSupported(!!document.fullscreenEnabled)

        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement)
        }

        document.addEventListener("fullscreenchange", handleFullscreenChange)

        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
        }
    }, [])

    const toggleFullscreen = useCallback(async () => {
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen()
            } else {
                await document.exitFullscreen()
            }
        } catch (err) {
            console.error("Fullscreen error:", err)
        }
    }, [])

    if (!isSupported) return null

    return (
        <Button
            variant="secondary"
            size="icon"
            className={cn(
                "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 h-10 w-10 rounded-full shadow-lg",
                "bg-background/80 backdrop-blur-sm border",
                "hover:bg-background hover:scale-110 transition-all duration-200",
                "opacity-50 hover:opacity-100"
            )}
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
            {isFullscreen ? (
                <Minimize className="h-4 w-4" />
            ) : (
                <Maximize className="h-4 w-4" />
            )}
        </Button>
    )
}
