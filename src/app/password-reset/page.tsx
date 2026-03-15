// New page for resetting password
"use client"

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useAuth } from '@/context/auth-context'
import { useToast } from '@/hooks/use-toast'
import { useTranslation } from '@/hooks/use-translation'
import { useSettings } from '@/context/settings-context'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

const passwordResetSchema = z.object({
    newPassword: z.string().min(8, { message: "Password must be at least 8 characters." }),
    confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
})

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

export default function PasswordResetPage() {
    const { user, login } = useAuth()
    const { toast } = useToast()
    const { t } = useTranslation()
    const { settings } = useSettings()
    const router = useRouter()

    const form = useForm<z.infer<typeof passwordResetSchema>>({
        resolver: zodResolver(passwordResetSchema),
        defaultValues: { newPassword: "", confirmPassword: "" },
    })

    const onSubmit = async (values: z.infer<typeof passwordResetSchema>) => {
        if (!user) return
        
        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email, newPassword: values.newPassword })
            });

            const updatedUser = await response.json();

            if (!response.ok) {
                throw new Error(updatedUser.message || 'Failed to reset password');
            }
            
            login(updatedUser) // This now directly updates the context and session storage
            
            toast({
                title: t('toasts.passwordUpdated'),
                description: t('toasts.passwordUpdatedDesc'),
            })
            
            router.push('/dashboard')
        } catch (error: any) {
             toast({
                variant: 'destructive',
                title: 'Password Reset Failed',
                description: error.message,
            })
        }
    }

    return (
        <div className="w-full min-h-screen flex items-center justify-center bg-muted">
            <Card className="w-[420px]">
                <CardHeader className="text-center">
                     <div className="flex justify-center items-center mb-4">
                        {settings.platformLogo ? (
                            <Image src={settings.platformLogo} alt="Platform Logo" width={60} height={60} className="rounded-md object-contain aspect-square" unoptimized />
                        ) : (
                            <LoungeChairIcon className="h-16 w-16 text-primary" />
                        )}
                    </div>
                    <CardTitle>{t('passwordReset.title')}</CardTitle>
                    <CardDescription>{t('passwordReset.description')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="newPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('settings.newPasswordLabel')}</FormLabel>
                                        <FormControl>
                                            <Input type="password" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('settings.confirmPasswordLabel')}</FormLabel>
                                        <FormControl>
                                            <Input type="password" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full">{t('passwordReset.submitButton')}</Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    )
}
