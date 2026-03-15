
"use client"

import { useState, useMemo, useRef } from "react"
import { MoreHorizontal, Edit, Trash2, Search, Download, Upload, CheckCircle2, AlertCircle, FileText } from "lucide-react"

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
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AddSupplierForm } from "./add-supplier-form"
import { useInventory } from "@/context/inventory-context"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/context/auth-context"
import { EditSupplierForm } from "./edit-supplier-form"
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog"
import { useTranslation } from "@/hooks/use-translation"
import { Pagination } from "@/components/ui/pagination"
import { Checkbox } from "@/components/ui/checkbox"

export function SuppliersTable() {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier } = useInventory()
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null)
  const [deletingSupplier, setDeletingSupplier] = useState<any | null>(null)
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<number>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const { user } = useAuth()
  const { t } = useTranslation()

  const canManage = user?.role === "Stock Manager" || user?.role === "Manager" || user?.role === "Super Admin"

  const handleUpdate = async (updated: any) => {
    try {
      await updateSupplier(updated)
      toast({
        title: t('toasts.supplierUpdated'),
        description: t('toasts.supplierUpdatedDesc', { name: updated.name }),
      })
      setEditingSupplier(null)
    } catch (error) {
      toast({
        title: t('toasts.error'),
        description: "Failed to update supplier",
        variant: "destructive"
      })
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteSupplier(id.toString())
      toast({
        title: t('toasts.supplierDeleted'),
        description: t('toasts.supplierDeletedDesc'),
      })
      setDeletingSupplier(null)
    } catch (error) {
      toast({
        title: t('toasts.error'),
        description: "Failed to delete supplier",
        variant: "destructive"
      })
    }
  }

  const handleBulkDelete = async () => {
    if (selectedSuppliers.size === 0) return;

    try {
      const promises = Array.from(selectedSuppliers).map(id => deleteSupplier(id.toString()));
      await Promise.all(promises);
      toast({
        title: t('toasts.success'),
        description: `${selectedSuppliers.size} suppliers deleted`,
      })
      setSelectedSuppliers(new Set());
    } catch (error) {
      toast({
        title: t('toasts.error'),
        description: "Some suppliers could not be deleted",
        variant: "destructive"
      })
    }
  }

  const handleExport = () => {
    const headers = ["Name", "Contact Person", "Phone", "Email", "Address"];
    const csvData = suppliers.map(s => [
      s.name,
      s.contact_person || "",
      s.phone || "",
      s.email || "",
      s.address || ""
    ]);

    const csvContent = [headers, ...csvData].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `suppliers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const downloadTemplate = () => {
    const headers = ["Name", "Contact Person", "Phone", "Email", "Address"];
    // Add sample row
    const sampleRow = "ACME Supplies,John Smith,555-1234,john@acme.com,123 Business Rd";
    const csvContent = headers.join(",") + "\n" + sampleRow + "\n";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "suppliers_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n");
      const headers = lines[0].split(",");
      // Skip header (0) and sample row (1)
      const data = lines.slice(2).filter(line => line.trim() !== "");

      let successCount = 0;
      let failCount = 0;

      for (const line of data) {
        const values = line.split(",");
        const supplier: any = {};
        headers.forEach((header, index) => {
          const key = header.trim().toLowerCase().replace(" ", "_");
          supplier[key] = values[index]?.trim();
        });

        if (supplier.name) {
          try {
            await addSupplier(supplier);
            successCount++;
          } catch (e) {
            failCount++;
          }
        }
      }

      toast({
        title: "Import Complete",
        description: `Successfully imported ${successCount} suppliers. ${failCount > 0 ? `${failCount} failed.` : ""}`,
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  }

  const toggleSelectAll = () => {
    if (selectedSuppliers.size === filteredSuppliers.length) {
      setSelectedSuppliers(new Set());
    } else {
      setSelectedSuppliers(new Set(filteredSuppliers.map(s => s.id)));
    }
  }

  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedSuppliers);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedSuppliers(newSelected);
  }

  // Filter suppliers based on search term
  const filteredSuppliers = useMemo(() => {
    if (!searchTerm) return suppliers;

    const search = searchTerm.toLowerCase();
    return suppliers.filter(supplier =>
      supplier.name.toLowerCase().includes(search) ||
      supplier.contact_person?.toLowerCase().includes(search) ||
      supplier.email?.toLowerCase().includes(search) ||
      supplier.phone?.toLowerCase().includes(search)
    );
  }, [suppliers, searchTerm]);

  // Paginate filtered suppliers
  const paginatedSuppliers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredSuppliers.slice(startIndex, endIndex);
  }, [filteredSuppliers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);

  // Reset to page 1 when search term changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".csv"
            onChange={handleImport}
          />
          <Button variant="outline" size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button variant="secondary" size="sm" className="gap-2" onClick={downloadTemplate}>
            <FileText className="h-4 w-4" />
            Template
          </Button>
          {selectedSuppliers.size > 0 && (
            <Button variant="destructive" size="sm" className="gap-2" onClick={handleBulkDelete}>
              <Trash2 className="h-4 w-4" />
              Delete Selected ({selectedSuppliers.size})
            </Button>
          )}
        </div>
        <AddSupplierForm onAddSupplier={addSupplier} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-headline">{t('suppliers.title')}</CardTitle>
              <CardDescription>
                {t('suppliers.description')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search suppliers..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            <Select value={itemsPerPage.toString()} onValueChange={(value) => {
              setItemsPerPage(parseInt(value));
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={selectedSuppliers.size > 0 && selectedSuppliers.size === filteredSuppliers.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>{t('suppliers.supplierName')}</TableHead>
                  <TableHead>{t('suppliers.contactPerson')}</TableHead>
                  <TableHead>{t('suppliers.phone')}</TableHead>
                  <TableHead>{t('suppliers.email')}</TableHead>
                  <TableHead>Address</TableHead>
                  {canManage && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSuppliers.length > 0 ? (
                  paginatedSuppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedSuppliers.has(supplier.id)}
                          onCheckedChange={() => toggleSelect(supplier.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{supplier.name}</TableCell>
                      <TableCell>{supplier.contact_person || "-"}</TableCell>
                      <TableCell>{supplier.phone || "-"}</TableCell>
                      <TableCell>{supplier.email || "-"}</TableCell>
                      <TableCell className="truncate max-w-[150px]">{supplier.address || "-"}</TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button aria-haspopup="true" size="icon" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Toggle menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>{t('inventory.actions')}</DropdownMenuLabel>
                              <DropdownMenuItem onSelect={() => setEditingSupplier(supplier)}>
                                <Edit className="mr-2 h-4 w-4" />
                                {t('dialogs.edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => setDeletingSupplier(supplier)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t('dialogs.delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={canManage ? 7 : 6} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                        <p>{searchTerm ? 'No suppliers match your search' : 'No suppliers yet'}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-4">
              <div className="text-sm text-muted-foreground">
                Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredSuppliers.length)} to{' '}
                {Math.min(currentPage * itemsPerPage, filteredSuppliers.length)} of {filteredSuppliers.length} suppliers
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {editingSupplier && (
        <EditSupplierForm
          supplier={editingSupplier}
          onUpdateSupplier={handleUpdate}
          open={!!editingSupplier}
          onOpenChange={(isOpen) => !isOpen && setEditingSupplier(null)}
        />
      )}

      {deletingSupplier && (
        <DeleteConfirmationDialog
          open={!!deletingSupplier}
          onOpenChange={(isOpen) => !isOpen && setDeletingSupplier(null)}
          onConfirm={() => handleDelete(deletingSupplier.id)}
          title={t('dialogs.deleteSupplierTitle')}
          description={t('dialogs.deleteSupplierDesc', { name: deletingSupplier.name })}
        />
      )}
    </>
  )
}

