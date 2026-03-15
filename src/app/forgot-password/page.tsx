// New page for forgot password instructions
"use client"

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from '@/hooks/use-translation'
import { useSettings } from '@/context/settings-context'
import Image from 'next/image'

function LoungeChairIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M14 17a2 2 0 1 0-4 0" />
            <path d="M6 10h12" />
            <path d="M16 4h-8" />
            <path d="M6 4v13" />
            <path d="M18 4v13" />
            <path d="M5 17h14" />
        </svg>
    )
}

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const { settings } = useSettings()

  return (
    <div className="w-full min-h-screen flex items-center justify-center">
      <div className="mx-auto grid w-[420px] gap-6 p-6 text-center">
         <div className="flex justify-center items-center mb-4">
            {settings.platformLogo ? (
                <Image src={settings.platformLogo} alt="Platform Logo" width={60} height={60} className="rounded-md object-contain aspect-square" unoptimized />
            ) : (
                <LoungeChairIcon className="h-16 w-16 text-primary" />
            )}
          </div>
        <div className="grid gap-2">
          <h1 className="text-3xl font-bold font-headline">{t('forgotPassword.title')}</h1>
          <p className="text-balance text-muted-foreground">
            {t('forgotPassword.description')}
          </p>
        </div>
        <div className="mt-4">
            <Link href="/login" className="inline-flex items-center text-sm font-medium text-primary hover:underline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('forgotPassword.backToLogin')}
            </Link>
        </div>
      </div>
    </div>
  )
}
