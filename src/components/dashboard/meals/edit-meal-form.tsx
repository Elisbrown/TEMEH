
"use client"

import React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useEffect } from "react"
import Image from "next/image"
import { Upload } from "lucide-react"

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { type Meal } from "@/context/product-context"
import { useTranslation } from "@/hooks/use-translation"
import { useCategories } from "@/context/category-context"

const formSchema = z.object({
  name: z.string().min(1, { message: "Meal name is required." }),
  price: z.coerce.number().min(0, { message: "Price can't be negative." }),
  category: z.string().min(1, { message: "Category is required." }),
  quantity: z.coerce.number().min(0, { message: "Quantity cannot be negative." }),
  image: z.string().optional(),
})

type EditMealFormProps = {
  meal: Meal
  onUpdateMeal: (meal: Meal) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditMealForm({ meal, onUpdateMeal, open, onOpenChange }: EditMealFormProps) {
  const { t } = useTranslation()
  const { categories } = useCategories()
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: meal,
  })
  
  const imageValue = form.watch("image");
  
  useEffect(() => {
    form.reset(meal);
  }, [meal, form]);

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
    onUpdateMeal({ ...meal, ...values });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('meals.editMeal')}</DialogTitle>
          <DialogDescription>
            {t('meals.editMealDesc')}
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
                        Change Image
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
                        <Input type="number" {...field} />
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
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('dialogs.cancel')}</Button>
              <Button type="submit">{t('dialogs.saveChanges')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
