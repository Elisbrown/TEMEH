
"use client"

import React, { useMemo, useState } from "react";
import { MoreHorizontal, Upload, Download, File, ChevronLeft, ChevronRight, Eye, Edit, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { useInventory } from "@/context/inventory-context";
import { useSettings } from "@/context/settings-context";
import type { InventoryItem } from "@/lib/db/inventory";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/use-translation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { InventoryMovementsDialog } from "./inventory-movements-dialog";
import { AddInventoryItemDialog } from "./add-inventory-item-dialog";
import { EditInventoryItemDialog } from "./edit-inventory-item-dialog";
import { StockMovementDialog } from "./stock-movement-dialog";
import { BulkMovementDialog } from "./bulk-movement-dialog";
import { exportInventoryToPDF } from "@/lib/pdf-export";

const statusOptions = ["All", "In Stock", "Low Stock", "Out of Stock"] as const;

export function InventoryTable() {
  const { items, deleteItem, loading, bulkAddItems } = useInventory();
  const { settings } = useSettings();
  const { toast } = useToast();
  const { t } = useTranslation();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Dialog states
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [movementsDialogOpen, setMovementsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [stockMovementDialogOpen, setStockMovementDialogOpen] = useState(false);
  const [movementType, setMovementType] = useState<'IN' | 'OUT'>('IN');

  const getStatusVariant = (status: InventoryItem['status']) => {
    switch (status) {
      case "In Stock":
        return "default";
      case "Low Stock":
        return "secondary";
      case "Out of Stock":
        return "destructive";
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = searchTerm === "" ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "All" || item.status === statusFilter;
      const matchesCategory = categoryFilter === "All" || item.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [items, searchTerm, statusFilter, categoryFilter]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(items.map(item => item.category))];
    return uniqueCategories.sort();
  }, [items]);

  const handleDownloadTemplate = () => {
    // Add sample row
    const csvContent = "data:text/csv;charset=utf-8,sku,name,category,description,unit,min_stock_level,max_stock_level,current_stock,cost_per_unit,supplier_id\nITEM-001,Sample Item,General,Description here,pieces,5,20,10,10.00,\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "inventory_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      try {
        const lines = text.split('\n').filter(line => line.trim() !== '');
        if (lines.length <= 1) {
          toast({ variant: "destructive", title: t('toasts.csvError'), description: t('toasts.csvEmpty') });
          return;
        }
        const headers = lines[0].split(',').map(h => h.trim());
        const requiredHeaders = ['sku', 'name', 'category', 'current_stock'];
        if (!requiredHeaders.every(h => headers.includes(h))) {
          toast({ variant: "destructive", title: t('toasts.csvError'), description: t('toasts.csvHeaders') });
          return;
        }

        // Process CSV import - Skip header (0) and sample row (1) if it exists/matches
        // User requested adding a sample row and ignoring it.
        const dataLines = lines.slice(2);

        if (dataLines.length === 0) {
          toast({ variant: "destructive", title: t('toasts.csvError'), description: "No data found to import (ignoring sample row)." });
          return;
        }

        const itemsToImport = dataLines.map(line => {
          const values = line.split(',').map(v => v.trim());
          const item: any = {};
          headers.forEach((header, index) => {
            const value = values[index];
            if (header === 'current_stock' || header === 'min_stock_level' || header === 'cost_per_unit') {
              item[header] = parseFloat(value) || 0;
            } else {
              item[header] = value;
            }
          });

          // Add default values for missing required fields
          if (!item.unit) item.unit = 'pieces';
          if (!item.min_stock_level) item.min_stock_level = 0;

          return item;
        });

        await bulkAddItems(itemsToImport);
        toast({ title: t('toasts.importSuccess'), description: t('toasts.importSuccessDesc', { count: itemsToImport.length }) });
      } catch (error) {
        toast({ variant: "destructive", title: t('toasts.importFailed'), description: t('toasts.importFailedDesc') });
        console.error("CSV Parsing Error:", error);
      } finally {
        if (event.target) {
          event.target.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  const handleExportCSV = () => {
    const headers = ["SKU", "Name", "Category", "Description", "Unit", "Min Stock", "Max Stock", "Current Stock", "Cost/Unit", "Status", "Supplier"];
    const rows = paginatedItems.map(item => [
      item.sku,
      item.name,
      item.category,
      item.description || '',
      item.unit,
      item.min_stock_level,
      item.max_stock_level || '',
      item.current_stock,
      item.cost_per_unit || '',
      item.status,
      item.supplier?.name || ''
    ]);

    let csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inventory_export_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    exportInventoryToPDF(filteredItems, `Inventory Report - ${statusFilter === 'All' ? 'All Statuses' : statusFilter}`);
  };

  const handleDelete = async (item: InventoryItem) => {
    try {
      await deleteItem(item.id);
      toast({
        title: t('toasts.itemDeleted'),
        description: t('toasts.itemDeletedDesc', { name: item.name }),
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('toasts.deleteFailed'),
        description: t('toasts.deleteFailedDesc'),
      });
    }
  };

  const handleViewMovements = (item: InventoryItem) => {
    setSelectedItem(item);
    setMovementsDialogOpen(true);
  };

  const handleEditItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setEditDialogOpen(true);
  };

  const handleStockMovement = (item: InventoryItem, type: 'IN' | 'OUT') => {
    setSelectedItem(item);
    setMovementType(type);
    setStockMovementDialogOpen(true);
  };

  const [bulkMovementDialogOpen, setBulkMovementDialogOpen] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Input
            placeholder={t('inventory.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map(status => (
                <SelectItem key={status} value={status}>
                  {status === 'All' ? t('inventory.allStatuses') : t(`inventory.${status.toLowerCase().replace(' ', '')}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">{t('inventory.allCategories')}</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchTerm("")
              setStatusFilter("All")
              setCategoryFilter("All")
              setCurrentPage(1)
            }}
            disabled={searchTerm === "" && statusFilter === "All" && categoryFilter === "All"}
          >
            {t('inventory.clearFilters')}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted/30 p-1 rounded-md border gap-1 mr-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1 hover:bg-green-500/10 hover:text-green-600 dark:hover:text-green-400"
              onClick={() => {
                setMovementType('IN');
                setBulkMovementDialogOpen(true);
              }}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Stock In
            </Button>
            <div className="w-px h-4 bg-border" />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
              onClick={() => {
                setMovementType('OUT');
                setBulkMovementDialogOpen(true);
              }}
            >
              <TrendingDown className="h-3.5 w-3.5" />
              Stock Out
            </Button>
          </div>
          <AddInventoryItemDialog />
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
              <DropdownMenuItem onSelect={handleExportCSV}>
                <Download className="mr-2 h-4 w-4" />
                {t('inventory.exportCSV')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleExportPDF}>
                <File className="mr-2 h-4 w-4" />
                {t('inventory.exportPDF') || 'Export PDF'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".csv"
            onChange={handleFileImport}
          />
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('inventory.item')}</TableHead>
              <TableHead>{t('inventory.sku')}</TableHead>
              <TableHead>{t('inventory.category')}</TableHead>
              <TableHead>{t('inventory.stock')}</TableHead>
              <TableHead>{t('inventory.cost')}</TableHead>
              <TableHead>{t('inventory.sellingPrice')}</TableHead>
              <TableHead>{t('inventory.profitPerUnit')}</TableHead>
              <TableHead>{t('inventory.status')}</TableHead>
              <TableHead>{t('inventory.supplier')}</TableHead>
              <TableHead>
                <span className="sr-only">{t('inventory.actions')}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  {t('inventory.noItemsFound')}
                </TableCell>
              </TableRow>
            ) : (
              paginatedItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={item.image || "https://placehold.co/100x100.png"} alt={item.name} />
                        <AvatarFallback>{item.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{item.name}</div>
                        {item.description && (
                          <div className="text-sm text-muted-foreground">{item.description}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{item.sku}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {typeof item.current_stock === 'number' ? Number(item.current_stock.toFixed(2)).toLocaleString() : item.current_stock} {item.unit}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t('inventory.minStock')}: {item.min_stock_level} {item.max_stock_level ? `| ${t('inventory.maxStock')}: ${item.max_stock_level}` : ''}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.cost_per_unit ? formatCurrency(item.cost_per_unit, settings.defaultCurrency) : '-'}
                  </TableCell>
                  <TableCell>
                    {item.selling_price ? formatCurrency(item.selling_price, settings.defaultCurrency) : '-'}
                  </TableCell>
                  <TableCell>
                    {item.selling_price && item.cost_per_unit ? (
                      <span className={item.selling_price - item.cost_per_unit >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {formatCurrency(item.selling_price - item.cost_per_unit, settings.defaultCurrency)}
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(item.status)}>
                      {t(`inventory.${item.status.toLowerCase().replace(' ', '')}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {item.supplier?.name || '-'}
                  </TableCell>
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
                        <DropdownMenuItem onSelect={() => handleViewMovements(item)}>
                          <Eye className="mr-2 h-4 w-4" />
                          {t('inventory.viewMovements')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleEditItem(item)}>
                          <Edit className="mr-2 h-4 w-4" />
                          {t('dialogs.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => handleStockMovement(item, 'IN')}>
                          <TrendingUp className="mr-2 h-4 w-4" />
                          {t('inventory.stockIn')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleStockMovement(item, 'OUT')}>
                          <TrendingDown className="mr-2 h-4 w-4" />
                          {t('inventory.stockOut')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={() => handleDelete(item)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('dialogs.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-muted-foreground">
          {t('inventory.showingResults', {
            start: (currentPage - 1) * itemsPerPage + 1,
            end: Math.min(currentPage * itemsPerPage, filteredItems.length),
            total: filteredItems.length
          })}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t('inventory.rowsPerPage')}</span>
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
            {t('inventory.previous')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            {t('inventory.next')}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Dialogs */}
      {selectedItem && (
        <>
          <InventoryMovementsDialog
            item={selectedItem}
            open={movementsDialogOpen}
            onOpenChange={setMovementsDialogOpen}
          />

          <EditInventoryItemDialog
            item={selectedItem}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
          />

          <StockMovementDialog
            item={selectedItem}
            type={movementType}
            open={stockMovementDialogOpen}
            onOpenChange={setStockMovementDialogOpen}
          />
        </>
      )}

      <BulkMovementDialog
        open={bulkMovementDialogOpen}
        onOpenChange={setBulkMovementDialogOpen}
        type={movementType}
      />
    </div>
  );
}

