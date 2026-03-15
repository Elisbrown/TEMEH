"use client"

import Image from "next/image"
import { useState, useEffect } from "react"
import { SetupForm } from "@/components/auth/setup-form"
import { useSettings } from "@/context/settings-context"
import { useTranslation } from "@/hooks/use-translation"

export default function SetupPage() {
  const { t } = useTranslation()
  const { settings } = useSettings()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="relative hidden bg-muted lg:block h-screen overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/60 to-black/80 flex items-center justify-center">
          <div className="text-center space-y-6 px-8">
            {isClient && (
              <>
                <div className="flex justify-center">
                  <Image
                    src={settings.platformLogo || "/logo.png"}
                    alt="Logo"
                    width={120}
                    height={120}
                    className="h-30 w-30 object-contain"
                    unoptimized
                  />
                </div>
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold text-white font-headline">
                    {settings.platformName || 'TEMEH'}
                  </h1>
                  <p className="text-lg text-white/90 max-w-md mx-auto">
                    Welcome! Let&apos;s get your management system ready.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[420px] gap-6 p-6">
          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold font-headline">Initial Setup</h1>
            <p className="text-balance text-muted-foreground">
              Create your Super Admin account to begin using TEMEH v1.1.
            </p>
          </div>
          <SetupForm />
        </div>
      </div>
    </div>
  )
}
