
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
import { useToast } from "@/hooks/use-toast"
import type { InventorySupplier as Supplier } from "@/context/inventory-context"
import { useTranslation } from "@/hooks/use-translation"

const formSchema = z.object({
  name: z.string().min(1, { message: "Supplier name is required." }),
  contact_person: z.string().optional(),
  phone: z.string().min(1, { message: "Phone number is required." }),
  email: z.string().email({ message: "A valid email is required." }).optional().or(z.literal("")),
  address: z.string().optional(),
})

type AddSupplierFormProps = {
  onAddSupplier: (supplier: any) => void
}

export function AddSupplierForm({ onAddSupplier }: AddSupplierFormProps) {
  const { toast } = useToast()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      contact_person: "",
      phone: "",
      email: "",
      address: "",
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    onAddSupplier(values)
    toast({
      title: t('toasts.supplierAdded'),
      description: t('toasts.supplierAddedDesc', { name: values.name }),
    })
    form.reset()
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <PlusCircle className="h-4 w-4" />
          {t('suppliers.addSupplier')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('suppliers.addSupplier')}</DialogTitle>
          <DialogDescription>
            {t('suppliers.addSupplierDesc')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('suppliers.supplierName')}</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Brasseries du Cameroun" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="contact_person"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('suppliers.contactPerson')}</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('suppliers.phone')}</FormLabel>
                   <FormControl>
                    <Input placeholder="+237 600 000 000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('suppliers.email')}</FormLabel>
                   <FormControl>
                    <Input type="email" placeholder="contact@supplier.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('suppliers.address')}</FormLabel>
                   <FormControl>
                    <Input placeholder="123 Street, City" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">{t('suppliers.addSupplier')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
