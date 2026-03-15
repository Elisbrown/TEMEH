
"use client"

import React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { PlusCircle, Upload } from "lucide-react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { type Meal } from "@/context/product-context"
import { useTranslation } from "@/hooks/use-translation"
import { useCategories } from "@/context/category-context"
import Image from "next/image"

const formSchema = z.object({
  name: z.string().min(1, { message: "Meal name is required." }),
  price: z.coerce.number().min(0, { message: "Price can't be negative." }),
  category: z.string().min(1, { message: "Category is required." }),
  quantity: z.coerce.number().min(0, { message: "Quantity cannot be negative." }),
  image: z.string().optional(),
})

type AddMealFormProps = {
  onAddMeal: (meal: Omit<Meal, 'id'>) => void;
}

export function AddMealForm({ onAddMeal }: AddMealFormProps) {
  const { toast } = useToast()
  const { t } = useTranslation()
  const { categories } = useCategories()
  const [open, setOpen] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      price: 0,
      category: "",
      quantity: 0,
      image: "https://placehold.co/150x150.png",
    },
  })
  
  const imageValue = form.watch("image");

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue("image", reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  function onSubmit(values: z.infer<typeof formSchema>) {
    onAddMeal({ ...values, image: values.image || "https://placehold.co/150x150.png" })
    toast({
      title: t('toasts.mealAdded'),
      description: t('toasts.mealAddedDesc', { name: values.name }),
    })
    form.reset()
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <PlusCircle className="h-4 w-4" />
          {t('meals.addMeal')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('meals.addMeal')}</DialogTitle>
          <DialogDescription>
            {t('meals.addMealDesc')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <FormItem>
                <FormLabel>Meal Image</FormLabel>
                <div className="flex items-center gap-4">
                    <Image src={imageValue || "https://placehold.co/150x150.png"} alt="Meal preview" width={80} height={80} className="rounded-md aspect-square object-cover" />
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Image
                    </Button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>
            </FormItem>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('meals.mealName')}</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Beef Burger" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
                 <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('meals.price')}</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="3000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('meals.quantity')}</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="10" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
             <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>{t('inventory.category')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder={t('meals.selectCategory')} />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {categories.map(cat => (
                           <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />

            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('dialogs.cancel')}</Button>
              <Button type="submit">{t('meals.addMeal')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
