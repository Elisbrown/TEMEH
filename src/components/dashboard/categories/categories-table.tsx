
"use client"

import { useState } from "react"
import { MoreHorizontal, Edit, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
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
import { AddCategoryForm } from "./add-category-form"
import { EditCategoryForm } from "./edit-category-form"
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/context/auth-context"
import { useCategories, type Category } from "@/context/category-context"

export function CategoriesTable() {
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories()
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const { toast } = useToast()
  const { user } = useAuth()
  
  const canManage = user?.role === "Manager" || user?.role === "Super Admin"

  const handleUpdateCategory = async (updatedCategory: Category) => {
    await updateCategory(updatedCategory)
    toast({
      title: "Category Updated",
      description: `The "${updatedCategory.name}" category has been updated.`,
    })
    setEditingCategory(null);
  }

  const handleDeleteCategory = async (categoryId: string) => {
    await deleteCategory(categoryId);
    toast({
      title: "Category Deleted",
      description: `The category has been successfully deleted.`,
    })
    setDeletingCategory(null);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-headline">Product Categories</CardTitle>
              <CardDescription>
                Group your products into categories for better organization.
              </CardDescription>
            </div>
            {canManage && <AddCategoryForm onAddCategory={addCategory} />}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category Name</TableHead>
                <TableHead>Number of Products</TableHead>
                {canManage && (
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>{category.productCount}</TableCell>
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
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onSelect={() => setEditingCategory(category)}>
                            <Edit className="mr-2 h-4 w-4"/>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setDeletingCategory(category)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4"/>
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {editingCategory && (
        <EditCategoryForm
          category={editingCategory}
          onUpdateCategory={handleUpdateCategory}
          open={!!editingCategory}
          onOpenChange={(isOpen) => !isOpen && setEditingCategory(null)}
        />
      )}

      {deletingCategory && (
        <DeleteConfirmationDialog
            open={!!deletingCategory}
            onOpenChange={(isOpen) => !isOpen && setDeletingCategory(null)}
            onConfirm={() => handleDeleteCategory(deletingCategory.id)}
            title="Delete Category"
            description={`Are you sure you want to delete the "${deletingCategory.name}" category? This action cannot be undone.`}
        />
      )}
    </>
  )
}
