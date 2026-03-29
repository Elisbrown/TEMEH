"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Receipt, TrendingDown, Calendar, Tag, FileText, Pencil, Trash2, AlertCircle } from "lucide-react";
import { useSettings } from "@/context/settings-context";
import { useTranslation } from "@/hooks/use-translation";

type ExpenseCategory = {
  id: number;
  name: string;
  description?: string;
};

type Expense = {
  id: number;
  category: string;
  amount: number;
  description?: string;
  receipt_url?: string;
  date: string;
  created_by?: number;
  created_at: string;
  creator?: { name: string };
};

const DEFAULT_CATEGORIES: ExpenseCategory[] = [
  { id: 1, name: "Utilities", description: "Electricity, water, internet" },
  { id: 2, name: "Maintenance", description: "Repairs and upkeep" },
  { id: 3, name: "Supplies", description: "Office and cleaning supplies" },
  { id: 4, name: "Transport", description: "Fuel and logistics" },
  { id: 5, name: "Salaries", description: "Staff payments" },
  { id: 6, name: "Other", description: "Miscellaneous expenses" },
];

export default function ExpensesPage() {
  const { settings } = useSettings();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories] = useState<ExpenseCategory[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("");
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [expenseForm, setExpenseForm] = useState({
    category: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    receipt_url: ''
  });

  const { t } = useTranslation();

  const handleAddExpense = async () => {
    if (!expenseForm.category || !expenseForm.amount) return;
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: categories.find(c => String(c.id) === expenseForm.category)?.name || expenseForm.category,
          amount: parseFloat(expenseForm.amount),
          date: expenseForm.date,
          description: expenseForm.description || null,
          receipt_url: expenseForm.receipt_url || null
        })
      });
      if (res.ok) {
        await fetchExpenses();
        setShowExpenseDialog(false);
        setExpenseForm({ category: '', amount: '', date: new Date().toISOString().split('T')[0], description: '', receipt_url: '' });
      }
    } catch (error) {
      console.error('Failed to add expense:', error);
    }
  };

  const handleUpdateExpense = async () => {
    if (!editingExpense || !expenseForm.category || !expenseForm.amount) return;
    try {
      const res = await fetch(`/api/expenses?id=${editingExpense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: categories.find(c => String(c.id) === expenseForm.category)?.name || expenseForm.category,
          amount: parseFloat(expenseForm.amount),
          date: expenseForm.date,
          description: expenseForm.description || null,
          receipt_url: expenseForm.receipt_url || null
        })
      });
      if (res.ok) {
        await fetchExpenses();
        setEditingExpense(null);
        setExpenseForm({ category: '', amount: '', date: new Date().toISOString().split('T')[0], description: '', receipt_url: '' });
      }
    } catch (error) {
      console.error('Failed to update expense:', error);
    }
  };

  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return;
    try {
      const res = await fetch(`/api/expenses?id=${expenseToDelete.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchExpenses();
        setShowDeleteDialog(false);
        setExpenseToDelete(null);
      }
    } catch (error) {
      console.error('Failed to delete expense:', error);
    }
  };

  const currencySymbol = settings.defaultCurrency?.symbol || "XAF";

  const formatCurrency = (amount: number) => {
    return `${currencySymbol} ${amount.toLocaleString()}`;
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setLoading(false);
    try {
      const res = await fetch("/api/expenses");
      if (res.ok) {
        const data = await res.json();
        setExpenses(data);
      }
    } catch (error) {
      console.error("Failed to fetch expenses:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredExpenses = expenses.filter(exp => {
    if (filterCategory !== "all") {
      const categoryObj = categories.find(c => String(c.id) === filterCategory);
      if (categoryObj && exp.category !== categoryObj.name) {
        return false;
      }
    }
    if (filterMonth) {
      const expMonth = exp.date ? exp.date.substring(0, 7) : "";
      if (expMonth !== filterMonth) return false;
    }
    return true;
  });

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const thisMonthExpenses = expenses.filter(e => {
    if (!e.date) return false;
    const now = new Date();
    const expDate = new Date(e.date);
    return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
  }).reduce((sum, e) => sum + e.amount, 0);

  const getCategoryColor = (categoryName: string): "default" | "secondary" | "destructive" | "outline" => {
    const nameToId = categories.find(c => c.name === categoryName)?.id || 0;
    const colors: Record<number, "default" | "secondary" | "destructive" | "outline"> = {
      1: "default",
      2: "secondary",
      3: "outline",
      4: "default",
      5: "destructive",
      6: "secondary",
    };
    return colors[nameToId] || "default";
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header title={t('expenses.title')} />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 container mx-auto">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold font-headline">{t('expenses.tracking')}</h1>
              <p className="text-muted-foreground">{t('expenses.description')}</p>
            </div>
            <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" /> {t('expenses.addExpense')}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('expenses.recordExpense')}</DialogTitle>
                  <DialogDescription>{t('expenses.description')}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t('expenses.category')}</Label>
                    <Select value={expenseForm.category} onValueChange={(val) => setExpenseForm(prev => ({ ...prev, category: val }))}>
                      <SelectTrigger><SelectValue placeholder={t('expenses.selectCategory') || "Select category"} /></SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount ({currencySymbol})</Label>
                    <Input type="number" placeholder="0" value={expenseForm.amount} onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm(prev => ({ ...prev, date: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('expenses.descriptionLabel') || 'Description'}</Label>
                    <Textarea placeholder={t('expenses.descriptionPlaceholder') || "Describe the expense..."} value={expenseForm.description} onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('expenses.receiptUrl')}</Label>
                    <Input type="url" placeholder="https://..." value={expenseForm.receipt_url} onChange={(e) => setExpenseForm(prev => ({ ...prev, receipt_url: e.target.value }))} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowExpenseDialog(false)}>{t('common.cancel')}</Button>
                  <Button onClick={handleAddExpense}>{t('expenses.saveExpense') || t('common.save')}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('expenses.totalExpenses')}</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
                <p className="text-xs text-muted-foreground">{filteredExpenses.length} {t('dashboard.items')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('expenses.thisMonth')}</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(thisMonthExpenses)}</div>
                <p className="text-xs text-muted-foreground">{t('dashboard.currentTotal')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('expenses.categories')}</CardTitle>
                <Tag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{categories.length}</div>
                <p className="text-xs text-muted-foreground">Expense categories</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('expenses.filterExpenses')}</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4">
              <div className="w-48">
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger><SelectValue placeholder={t('inventory.allCategories')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('inventory.allCategories')}</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <Input 
                  type="month" 
                  value={filterMonth} 
                  onChange={(e) => setFilterMonth(e.target.value)}
                  placeholder="Filter by month"
                />
              </div>
              {(filterCategory !== "all" || filterMonth) && (
                <Button variant="ghost" onClick={() => { setFilterCategory("all"); setFilterMonth(""); }}>
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Expenses Table */}
          <Card>
            <CardHeader>
              <CardTitle>{t('expenses.expenseRecords')}</CardTitle>
              <CardDescription>{t('expenses.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.date')}</TableHead>
                    <TableHead>{t('expenses.category')}</TableHead>
                    <TableHead>{t('expenses.descriptionLabel') || 'Description'}</TableHead>
                    <TableHead className="text-right">{t('expenses.amount')}</TableHead>
                    <TableHead>{t('pos.receipt') || 'Receipt'}</TableHead>
                    <TableHead>{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                    </TableRow>
                  ) : filteredExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        {expenses.length === 0 ? "No expenses recorded yet" : "No expenses match filters"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredExpenses.map(exp => (
                      <TableRow key={exp.id}>
                        <TableCell>
                          {exp.date && !isNaN(Date.parse(exp.date)) 
                            ? new Date(exp.date).toLocaleDateString() 
                            : t('common.invalidDate') || 'Invalid Date'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getCategoryColor(exp.category)}>
                            {exp.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate">{exp.description || '-'}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(exp.amount)}</TableCell>
                        <TableCell>
                          {exp.receipt_url && exp.receipt_url !== "null" && exp.receipt_url !== "" ? (
                            <a href={exp.receipt_url} target="_blank" rel="noopener noreferrer">
                              <FileText className="h-4 w-4 text-primary" />
                            </a>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => {
                              const catId = categories.find(c => c.name === exp.category)?.id;
                              setExpenseForm({
                                category: String(catId || ''),
                                amount: String(exp.amount),
                                date: exp.date.split('T')[0],
                                description: exp.description || '',
                                receipt_url: exp.receipt_url || ''
                              });
                              setEditingExpense(exp);
                            }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => {
                              setExpenseToDelete(exp);
                              setShowDeleteDialog(true);
                            }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Edit Expense Dialog */}
      <Dialog open={!!editingExpense} onOpenChange={(open) => !open && setEditingExpense(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('expenses.editExpense')}</DialogTitle>
            <DialogDescription>{t('expenses.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('expenses.category')}</Label>
              <Select value={expenseForm.category} onValueChange={(val) => setExpenseForm(prev => ({ ...prev, category: val }))}>
                <SelectTrigger><SelectValue placeholder={t('expenses.selectCategory') || "Select category"} /></SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount ({currencySymbol})</Label>
              <Input type="number" placeholder="0" value={expenseForm.amount} onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm(prev => ({ ...prev, date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{t('expenses.descriptionLabel') || 'Description'}</Label>
              <Textarea 
                placeholder={t('expenses.descriptionPlaceholder') || "Describe the expense..."} 
                value={expenseForm.description} 
                onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))} 
              />
            </div>
            <div className="space-y-2">
              <Label>{t('expenses.receiptUrl')}</Label>
              <Input type="url" placeholder="https://..." value={expenseForm.receipt_url} onChange={(e) => setExpenseForm(prev => ({ ...prev, receipt_url: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingExpense(null)}>{t('common.cancel')}</Button>
            <Button onClick={handleUpdateExpense}>{t('expenses.saveExpense') || t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-4 text-destructive mb-2">
              <div className="bg-destructive/10 p-2 rounded-full">
                <AlertCircle className="h-6 w-6" />
              </div>
              <DialogTitle>{t('expenses.deleteExpense')}</DialogTitle>
            </div>
            <DialogDescription>
              {t('expenses.confirmDelete')}
              {expenseToDelete && (
                <div className="mt-4 p-4 bg-muted rounded-md text-sm">
                  <div className="flex justify-between">
                    <span className="font-semibold">{expenseToDelete.category}</span>
                    <span className="font-bold">{formatCurrency(expenseToDelete.amount)}</span>
                  </div>
                  <div className="mt-1 text-muted-foreground truncate">{expenseToDelete.description}</div>
                  <div className="mt-1 text-xs">{new Date(expenseToDelete.date).toLocaleDateString()}</div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeleteExpense}>
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
