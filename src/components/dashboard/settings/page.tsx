
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useAuth } from "@/context/auth-context"
import { Header } from "@/components/dashboard/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useTranslation } from "@/hooks/use-translation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Edit } from "lucide-react"
import React from "react"

const profileFormSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email(),
  avatar: z.string().optional(),
})

const passwordFormSchema = z.object({
    currentPassword: z.string().min(1, { message: "Current password is required." }),
    newPassword: z.string().min(6, { message: "New password must be at least 6 characters." }),
    confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
})


export default function SettingsPage() {
  const { user, login } = useAuth()
  const { toast } = useToast()
  const { t } = useTranslation()
  const fileInputRef = React.useRef<HTMLInputElement>(null);


  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      avatar: user?.avatar || "",
    },
  })
  
  React.useEffect(() => {
    if (user) {
        profileForm.reset({
            name: user.name,
            email: user.email,
            avatar: user.avatar,
        })
    }
  }, [user, profileForm])

  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    }
  })

  function onProfileSubmit(values: z.infer<typeof profileFormSchema>) {
    if (user) {
        const updatedUser = { ...user, ...values };
        login(updatedUser)
        toast({
            title: t('toasts.profileUpdated'),
            description: t('toasts.profileUpdatedDesc'),
        })
    }
  }

  function onPasswordSubmit(values: z.infer<typeof passwordFormSchema>) {
    // In a real app, you would verify the current password here
    console.log(values)
    toast({
        title: t('toasts.passwordUpdated'),
        description: t('toasts.passwordUpdatedDesc'),
    })
    passwordForm.reset()
  }

  const handlePictureUpload = () => {
    fileInputRef.current?.click();
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        profileForm.setValue("avatar", dataUrl);
        // In a real app, you might auto-submit or just stage the change
        if (user) {
            login({ ...user, avatar: dataUrl });
        }
        toast({
            title: "Avatar Updated",
            description: `Your profile picture has been updated. Save changes to make it permanent.`,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header title={t('settings.title')} />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="mx-auto grid w-full max-w-6xl gap-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.profile')}</CardTitle>
                <CardDescription>
                  {t('settings.profileDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col md:flex-row gap-8">
                <div className="relative w-fit group">
                  <Avatar className="h-32 w-32 border-2 border-primary">
                    <AvatarImage src={profileForm.watch("avatar") || "https://placehold.co/128x128.png"} alt={user?.name} data-ai-hint="person portrait" />
                    <AvatarFallback>{user?.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <Button onClick={handlePictureUpload} size="icon" className="absolute bottom-1 right-1 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Edit profile picture</span>
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/png, image/jpeg"
                  />
                </div>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-8 max-w-md flex-1">
                    <FormField
                      control={profileForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('settings.name')}</FormLabel>
                          <FormControl>
                            <Input placeholder="Your name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('settings.email')}</FormLabel>
                          <FormControl>
                            <Input placeholder="Your email" {...field} disabled />
                          </FormControl>
                           <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit">{t('settings.updateProfile')}</Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('settings.changePassword')}</CardTitle>
                <CardDescription>
                  {t('settings.changePasswordDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-8 max-w-md">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('settings.currentPassword')}</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                           <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={passwordForm.control}
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
                      control={passwordForm.control}
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
                    <Button type="submit">{t('settings.changePassword')}</Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t('settings.language.title')}</CardTitle>
                    <CardDescription>
                        {t('settings.language.description')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <LanguageSwitcher />
                </CardContent>
            </Card>

          </div>
        </div>
      </main>
    </div>
  )
}
