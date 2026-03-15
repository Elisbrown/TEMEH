
"use client"

import React, { useState, useMemo } from "react"
import { MoreHorizontal, Edit, Trash2, File, Upload, Download, ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useProducts, type Meal } from "@/context/product-context"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/context/auth-context"
import { AddMealForm } from "./add-meal-form"
import { EditMealForm } from "./edit-meal-form"
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog"
import { useTranslation } from "@/hooks/use-translation"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCategories } from "@/context/category-context"

const statusOptions = ["All", "In Stock", "Low Stock", "Out of Stock"];

export function MealsTable() {
    const { meals, addMeal, updateMeal, deleteMeal, setMeals } = useProducts()
    const { categories } = useCategories();
    const [editingMeal, setEditingMeal] = useState<Meal | null>(null)
    const [deletingMeal, setDeletingMeal] = useState<Meal | null>(null)
    const { toast } = useToast()
    const { user } = useAuth()
    const { t } = useTranslation()
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    const [searchTerm, setSearchTerm] = useState("")
    const [categoryFilter, setCategoryFilter] = useState("All")
    const [statusFilter, setStatusFilter] = useState("All")
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const canManage = user?.role === "Manager" || user?.role === "Super Admin" || user?.role === "Stock Manager" || user?.role === "Chef"

    const handleUpdate = (updated: Meal) => {
        updateMeal(updated)
        toast({
            title: t('toasts.mealUpdated'),
            description: t('toasts.mealUpdatedDesc', { name: updated.name }),
        })
        setEditingMeal(null)
    }

    const handleDelete = (id: string) => {
        deleteMeal(id)
        toast({
            title: t('toasts.mealDeleted'),
            description: t('toasts.mealDeletedDesc'),
        })
        setDeletingMeal(null)
    }

    const getStatusVariant = (quantity: number) => {
        if (quantity <= 0) return "destructive"
        if (quantity < 10) return "secondary"
        return "success"
    }

    const getStatusTextKey = (quantity: number) => {
        if (quantity <= 0) return 'inventory.outofstock'
        if (quantity < 10) return 'inventory.lowstock'
        return 'inventory.instock'
    }

    const getStatusFromQuantity = (quantity: number) => {
        if (quantity <= 0) return "Out of Stock"
        if (quantity < 10) return "Low Stock"
        return "In Stock"
    }

    const filteredMeals = useMemo(() => {
        return meals.filter(meal => {
            const matchesSearch = searchTerm === "" || meal.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = categoryFilter === "All" || meal.category === categoryFilter;
            const mealStatus = getStatusFromQuantity(meal.quantity);
            const matchesStatus = statusFilter === "All" || mealStatus === statusFilter;
            return matchesSearch && matchesCategory && matchesStatus;
        })
    }, [meals, searchTerm, categoryFilter, statusFilter])

    const totalPages = Math.ceil(filteredMeals.length / itemsPerPage);
    const paginatedMeals = filteredMeals.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);



    const handleDownloadTemplate = () => {
        // Add sample row
        const csvContent = "data:text/csv;charset=utf-8,name,price,category,quantity\nCheeseburger,1500,Burgers,50\n"
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", "meals_template.csv")
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const handleImportClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (e) => {
            const text = e.target?.result as string
            try {
                const lines = text.split('\n').filter(line => line.trim() !== '')
                if (lines.length <= 1) {
                    toast({ variant: "destructive", title: t('toasts.csvError'), description: t('toasts.csvEmpty') })
                    return
                }
                const headers = lines[0].split(',').map(h => h.trim())
                const requiredHeaders = ['name', 'price', 'category', 'quantity']
                if (!requiredHeaders.every(h => headers.includes(h))) {
                    toast({ variant: "destructive", title: t('toasts.csvError'), description: t('toasts.csvHeaders') })
                    return
                }

                // Skip header (0) and sample row (1)
                const dataLines = lines.slice(2);

                if (dataLines.length === 0) {
                    toast({ variant: "destructive", title: t('toasts.csvError'), description: "No data found to import (ignoring sample row)." })
                    return
                }

                const newMeals: Omit<Meal, 'id'>[] = dataLines.map(line => {
                    const values = line.split(',')
                    const mealData: any = {}
                    headers.forEach((header, index) => {
                        mealData[header] = values[index]?.trim() || ''
                    })

                    const price = parseFloat(mealData.price)
                    const quantity = parseInt(mealData.quantity, 10)
                    if (isNaN(price) || isNaN(quantity)) {
                        console.warn(`Skipping invalid row: ${line}`)
                        return null
                    }

                    return {
                        name: mealData.name,
                        price: price,
                        category: mealData.category,
                        quantity: quantity,
                        image: "https://placehold.co/150x150.png",
                    }
                }).filter((meal): meal is Omit<Meal, 'id'> => meal !== null);

                newMeals.forEach(addMeal);
                toast({ title: t('toasts.importSuccess'), description: t('toasts.importSuccessDesc', { count: newMeals.length }) })
            } catch (error) {
                toast({ variant: "destructive", title: t('toasts.importFailed'), description: t('toasts.importFailedDesc') })
                console.error("CSV Parsing Error:", error)
            } finally {
                if (event.target) {
                    event.target.value = ''
                }
            }
        }
        reader.readAsText(file)
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="font-headline">{t('meals.title')}</CardTitle>
                            <CardDescription>
                                {t('meals.description')}
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            {canManage && <AddMealForm onAddMeal={addMeal} />}
                            {canManage && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="gap-1">
                                            <File className="h-4 w-4" />
                                            {t('inventory.fileActions')}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>{t('inventory.csvActions')}</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onSelect={handleImportClick}>
                                            <Upload className="mr-2 h-4 w-4" />
                                            {t('inventory.importCSV')}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={handleDownloadTemplate}>
                                            <Download className="mr-2 h-4 w-4" />
                                            {t('inventory.downloadTemplate')}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".csv"
                                onChange={handleFileImport}
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                        <Input
                            placeholder="Search by name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Categories</SelectItem>
                                {categories.map(cat => (
                                    <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {statusOptions.map(status => (
                                    <SelectItem key={status} value={status}>{status === 'All' ? 'All Statuses' : status}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setSearchTerm("")
                                setCategoryFilter("All")
                                setStatusFilter("All")
                                setCurrentPage(1)
                            }}
                            disabled={searchTerm === "" && categoryFilter === "All" && statusFilter === "All"}
                        >
                            {t('inventory.clearFilters')}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('meals.meal')}</TableHead>
                                    <TableHead>{t('inventory.category')}</TableHead>
                                    <TableHead>{t('meals.price')}</TableHead>
                                    <TableHead>{t('meals.quantityAvailable')}</TableHead>
                                    <TableHead>{t('meals.stockSource')}</TableHead>
                                    <TableHead>{t('inventory.status')}</TableHead>
                                    {canManage && (
                                        <TableHead>
                                            <span className="sr-only">{t('inventory.actions')}</span>
                                        </TableHead>
                                    )}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedMeals.map((meal) => (
                                    <TableRow key={meal.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9">
                                                    <AvatarImage src={meal.image} alt={meal.name} data-ai-hint="food meal" />
                                                    <AvatarFallback>{meal.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                {meal.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>{meal.category}</TableCell>
                                        <TableCell>XAF {meal.price.toLocaleString()}</TableCell>
                                        <TableCell>{meal.quantity}</TableCell>
                                        <TableCell>
                                            <Badge variant={meal.id.startsWith('inv_') ? "secondary" : "default"}>
                                                {meal.id.startsWith('inv_') ? t('meals.inventoryItem') : t('meals.regularProduct')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusVariant(meal.quantity)}>
                                                {t(getStatusTextKey(meal.quantity))}
                                            </Badge>
                                        </TableCell>
                                        {canManage && (
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button aria-haspopup="true" size="icon" variant="ghost">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                            <span className="sr-only">Toggle menu</span>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>{t('inventory.actions')}</DropdownMenuLabel>
                                                        {!meal.id.startsWith('inv_') && (
                                                            <DropdownMenuItem onSelect={() => setEditingMeal(meal)}>
                                                                <Edit className="mr-2 h-4 w-4" />
                                                                {t('dialogs.edit')}
                                                            </DropdownMenuItem>
                                                        )}
                                                        {!meal.id.startsWith('inv_') && (
                                                            <DropdownMenuItem onSelect={() => setDeletingMeal(meal)} className="text-destructive">
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                {t('dialogs.delete')}
                                                            </DropdownMenuItem>
                                                        )}
                                                        {meal.id.startsWith('inv_') && (
                                                            <DropdownMenuItem disabled className="text-muted-foreground">
                                                                <Edit className="mr-2 h-4 w-4" />
                                                                {t('dialogs.edit')} (Managed in Inventory)
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-muted-foreground">
                            Page {currentPage} of {totalPages}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Rows per page:</span>
                            <Select value={String(itemsPerPage)} onValueChange={(value) => setItemsPerPage(Number(value))}>
                                <SelectTrigger className="w-20">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="20">20</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                    <SelectItem value="100">100</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                            >
                                Next
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {editingMeal && (
                <EditMealForm
                    meal={editingMeal}
                    onUpdateMeal={handleUpdate}
                    open={!!editingMeal}
                    onOpenChange={(isOpen) => !isOpen && setEditingMeal(null)}
                />
            )}

            {deletingMeal && (
                <DeleteConfirmationDialog
                    open={!!deletingMeal}
                    onOpenChange={(isOpen) => !isOpen && setDeletingMeal(null)}
                    onConfirm={() => handleDelete(deletingMeal.id)}
                    title={t('dialogs.deleteMealTitle')}
                    description={t('dialogs.deleteMealDesc', { name: deletingMeal.name })}
                />
            )}
        </>
    )
}
