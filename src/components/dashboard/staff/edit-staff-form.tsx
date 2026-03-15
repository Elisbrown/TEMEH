
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useEffect } from "react"
import type { StaffMember, StaffRole } from "@/context/staff-context"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { useAuth } from "@/context/auth-context"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
import { useTranslation } from "@/hooks/use-translation"
import { cn } from "@/lib/utils"


const formSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  email: z.string().email(),
  phone: z.string().optional(),
  hireDate: z.date().optional(),
  role: z.enum(["Super Admin", "Manager", "Accountant", "Cashier"] as const),
  emergency_contact_name: z.string().optional(),
  emergency_contact_relationship: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
})

type EditStaffFormProps = {
  staffMember: StaffMember
  onUpdateStaff: (staff: StaffMember) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditStaffForm({ staffMember, onUpdateStaff, open, onOpenChange }: EditStaffFormProps) {
  const { t } = useTranslation()
  const { user } = useAuth()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...staffMember,
      phone: staffMember.phone || "",
      hireDate: staffMember.hireDate ? new Date(staffMember.hireDate) : undefined,
      emergency_contact_name: staffMember.emergency_contact_name || "",
      emergency_contact_relationship: staffMember.emergency_contact_relationship || "",
      emergency_contact_phone: staffMember.emergency_contact_phone || "",
    },
  })

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const selectedRole = form.watch("role");

  useEffect(() => {
    form.reset({
      ...staffMember,
      phone: staffMember.phone || "",
      hireDate: staffMember.hireDate ? new Date(staffMember.hireDate) : undefined,
      emergency_contact_name: staffMember.emergency_contact_name || "",
      emergency_contact_relationship: staffMember.emergency_contact_relationship || "",
      emergency_contact_phone: staffMember.emergency_contact_phone || "",
    });
  }, [staffMember, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    onUpdateStaff({ ...staffMember, ...values, role: values.role as StaffRole });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('staff.editStaff')}</DialogTitle>
          <DialogDescription>
            {t('staff.editStaffDesc', { name: staffMember.name })}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('staff.name')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                  <FormLabel>{t('staff.email')}</FormLabel>
                  <FormControl>
                    <Input {...field} disabled />
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
                  <FormLabel>{t('staff.phone')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="hireDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t('staff.hireDate')}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>{t('reports.pickDate')}</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('staff.role')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={staffMember.role === 'Super Admin'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('staff.selectRole')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {user?.role === "Super Admin" && <SelectItem value="Super Admin">Super Admin</SelectItem>}
                      <SelectItem value="Manager">Manager</SelectItem>
                      <SelectItem value="Accountant">Accountant</SelectItem>
                      <SelectItem value="Cashier">Cashier</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />


            <div className="border-t pt-2 mt-2">
              <h4 className="text-sm font-medium mb-3">Emergency Contact Information</h4>
              <div className="grid gap-4">
                <FormField
                  control={form.control}
                  name="emergency_contact_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Next of Kin Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="emergency_contact_relationship"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Relationship</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Spouse, Parent" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="emergency_contact_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="Phone Number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

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
