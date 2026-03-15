
"use client"

import Image from "next/image"
import Link from "next/link"
import { useState, useEffect } from "react"
import { LoginForm } from "@/components/auth/login-form"
import { useSettings } from "@/context/settings-context"
import { useTranslation } from "@/hooks/use-translation"
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel"
import Autoplay from "embla-carousel-autoplay"
import { Skeleton } from "@/components/ui/skeleton"

export default function LoginPage() {
  const { t } = useTranslation()
  const { settings } = useSettings()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="relative hidden bg-muted lg:block h-screen overflow-hidden">
        {/* Background Carousel */}
        <div className="absolute inset-0">
          <Image
            src="/landing.jpg"
            alt="Login background"
            fill
            className="object-cover"
            priority
            unoptimized
          />
        </div>

        {/* Overlay with Logo, Name, and Tagline */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/60 flex items-center justify-center">
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
                    {t('appDescription')}
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
            <h1 className="text-3xl font-bold font-headline">{t('login.title')}</h1>
            <p className="text-balance text-muted-foreground">
              {t('login.description')}
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
