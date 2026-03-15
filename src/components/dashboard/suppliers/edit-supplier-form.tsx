
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import type { InventorySupplier as Supplier } from "@/context/inventory-context"
import { useTranslation } from "@/hooks/use-translation"

const formSchema = z.object({
  name: z.string().min(1, { message: "Supplier name is required." }),
  contact_person: z.string().optional(),
  phone: z.string().min(1, { message: "Phone number is required." }),
  email: z.string().email({ message: "A valid email is required." }).optional().or(z.literal("")),
  address: z.string().optional(),
})

type EditSupplierFormProps = {
  supplier: any
  onUpdateSupplier: (supplier: any) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditSupplierForm({ supplier, onUpdateSupplier, open, onOpenChange }: EditSupplierFormProps) {
  const { t } = useTranslation()
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: supplier,
  })

  useEffect(() => {
    form.reset(supplier);
  }, [supplier, form]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    onUpdateSupplier({ ...supplier, ...values });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('suppliers.editSupplier')}</DialogTitle>
          <DialogDescription>
            {t('suppliers.editSupplierDesc')}
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
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('dialogs.cancel')}</Button>
              <Button type="submit">{t('dialogs.saveChanges')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
