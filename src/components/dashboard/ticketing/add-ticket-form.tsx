
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { PlusCircle } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import type { Ticket, TicketPriority, TicketCategory } from "@/context/ticket-context"
import type { User } from "@/context/auth-context"
import { useTranslation } from "@/hooks/use-translation"

const formSchema = z.object({
  title: z.string().min(1, { message: "Title is required." }),
  description: z.string().min(1, { message: "Description is required." }),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]),
  category: z.enum(["IT Support", "Maintenance", "Inventory Request", "HR Issue"]),
})

type AddTicketFormProps = {
  onAddTicket: (ticket: Pick<Ticket, 'title' | 'description' | 'priority' | 'category' | 'created_by'>) => void
  currentUser: User
}

export function AddTicketForm({ onAddTicket, currentUser }: AddTicketFormProps) {
  const { toast } = useToast()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "Medium",
      category: "IT Support",
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    onAddTicket({
        ...values,
        created_by: Number(currentUser.id),
        priority: values.priority as any,
        category: values.category as any,
    })
    toast({
      title: t('toasts.ticketCreated'),
      description: t('toasts.ticketCreatedDesc', { title: values.title }),
    })
    form.reset()
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <PlusCircle className="h-4 w-4" />
          {t('support.createTicket')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('support.createTicket')}</DialogTitle>
          <DialogDescription>
            {t('support.createTicketDesc')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('support.title')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('support.titlePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('support.description')}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t('support.descriptionPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>{t('support.priority')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder={t('support.selectPriority')} />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="Low">{t('support.priorities.low')}</SelectItem>
                            <SelectItem value="Medium">{t('support.priorities.medium')}</SelectItem>
                            <SelectItem value="High">{t('support.priorities.high')}</SelectItem>
                            <SelectItem value="Urgent">{t('support.priorities.urgent')}</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>{t('support.category')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder={t('support.selectCategory')} />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="IT Support">{t('support.categories.it')}</SelectItem>
                            <SelectItem value="Maintenance">{t('support.categories.maintenance')}</SelectItem>
                            <SelectItem value="Inventory Request">{t('support.categories.inventory')}</SelectItem>
                            <SelectItem value="HR Issue">{t('support.categories.hr')}</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>

            <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setOpen(false)}>{t('dialogs.cancel')}</Button>
                <Button type="submit">{t('support.submitTicket')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
