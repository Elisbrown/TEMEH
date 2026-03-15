"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Wallet, DollarSign, CreditCard, Calendar, User } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { useSettings } from "@/context/settings-context";

type Advance = {
  id: number;
  employee_id: number;
  amount: number;
  reason?: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected' | 'repaid';
  employee?: { name: string; email: string };
};

type Salary = {
  id: number;
  employee_id: number;
  base_salary: number;
  effective_date: string;
  notes?: string;
  employee?: { name: string; email: string };
};

type Payout = {
  id: number;
  employee_id: number;
  amount: number;
  period_start: string;
  period_end: string;
  deductions: number;
  bonuses: number;
  net_amount: number;
  payment_date: string;
  employee?: { name: string; email: string };
};

type Staff = {
  id: number;
  name: string;
  email: string;
  role: string;
};

export default function PayrollPage() {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState("advances");
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdvanceDialog, setShowAdvanceDialog] = useState(false);
  const [showPayoutDialog, setShowPayoutDialog] = useState(false);
  const [showSalaryDialog, setShowSalaryDialog] = useState(false);
  const [editingAdvance, setEditingAdvance] = useState<Advance | null>(null);
  const [editingSalary, setEditingSalary] = useState<Salary | null>(null);
  const [editingPayout, setEditingPayout] = useState<Payout | null>(null);
  const [salaryForm, setSalaryForm] = useState({ employee_id: '', base_salary: '', effective_date: new Date().toISOString().split('T')[0], notes: '' });
  const [advanceForm, setAdvanceForm] = useState({ employee_id: '', amount: '', date: new Date().toISOString().split('T')[0], reason: '' });
  const [payoutForm, setPayoutForm] = useState({ employee_id: '', amount: '', period_start: '', period_end: '', deductions: '0', bonuses: '0', payment_date: new Date().toISOString().split('T')[0] });

  const currencySymbol = settings.defaultCurrency?.symbol || "XAF";

  const formatCurrency = (amount: number) => {
    return `${currencySymbol} ${amount.toLocaleString()}`;
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [advRes, salRes, payRes, staffRes] = await Promise.all([
        fetch("/api/payroll/advances"),
        fetch("/api/payroll/salaries"),
        fetch("/api/payroll/payouts"),
        fetch("/api/staff"),
      ]);
      
      if (advRes.ok) setAdvances(await advRes.json());
      if (salRes.ok) setSalaries(await salRes.json());
      if (payRes.ok) setPayouts(await payRes.json());
      if (staffRes.ok) {
        const staffData = await staffRes.json();
        setStaff(staffData.staff || staffData);
      }
    } catch (error) {
      console.error("Failed to fetch payroll data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: Advance['status']) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
      repaid: "outline",
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  const handleSetSalary = async () => {
    if (!salaryForm.employee_id || !salaryForm.base_salary) return;
    try {
      const res = await fetch('/api/payroll/salaries', {
        method: editingSalary ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingSalary?.id,
          employee_id: parseInt(salaryForm.employee_id),
          base_salary: parseFloat(salaryForm.base_salary),
          effective_date: salaryForm.effective_date,
          notes: salaryForm.notes || null
        })
      });
      if (res.ok) {
        await fetchData();
        setShowSalaryDialog(false);
        setEditingSalary(null);
        setSalaryForm({ employee_id: '', base_salary: '', effective_date: new Date().toISOString().split('T')[0], notes: '' });
      }
    } catch (error) {
      console.error('Failed to set salary:', error);
    }
  };

  const handleAddAdvance = async () => {
    if (!advanceForm.employee_id || !advanceForm.amount) return;
    try {
      const res = await fetch('/api/payroll/advances', {
        method: editingAdvance ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingAdvance?.id,
          employee_id: parseInt(advanceForm.employee_id),
          amount: parseFloat(advanceForm.amount),
          date: advanceForm.date,
          reason: advanceForm.reason || null,
          status: editingAdvance?.status || 'pending'
        })
      });
      if (res.ok) {
        await fetchData();
        setShowAdvanceDialog(false);
        setEditingAdvance(null);
        setAdvanceForm({ employee_id: '', amount: '', date: new Date().toISOString().split('T')[0], reason: '' });
      }
    } catch (error) {
      console.error('Failed to add advance:', error);
    }
  };

  const handleAddPayout = async () => {
    if (!payoutForm.employee_id || !payoutForm.amount) return;
    const amount = parseFloat(payoutForm.amount);
    const deductions = parseFloat(payoutForm.deductions) || 0;
    const bonuses = parseFloat(payoutForm.bonuses) || 0;
    const net_amount = amount - deductions + bonuses;
    try {
      const res = await fetch(editingPayout ? '/api/payroll/payouts' : '/api/payroll/payouts', {
        method: editingPayout ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingPayout?.id,
          employee_id: parseInt(payoutForm.employee_id),
          amount,
          period_start: payoutForm.period_start,
          period_end: payoutForm.period_end,
          deductions,
          bonuses,
          net_amount,
          payment_date: payoutForm.payment_date
        })
      });
      if (res.ok) {
        await fetchData();
        setShowPayoutDialog(false);
        setEditingPayout(null);
        setPayoutForm({ employee_id: '', amount: '', period_start: '', period_end: '', deductions: '0', bonuses: '0', payment_date: new Date().toISOString().split('T')[0] });
      }
    } catch (error) {
      console.error('Failed to add payout:', error);
    }
  };

  const handleDelete = async (type: 'advances' | 'salaries' | 'payouts', id: number) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    try {
      const res = await fetch(`/api/payroll/${type}?id=${id}`, { method: 'DELETE' });
      if (res.ok) await fetchData();
    } catch (error) {
      console.error(`Failed to delete ${type}:`, error);
    }
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    const data = activeTab === 'advances' ? advances : activeTab === 'salaries' ? salaries : payouts;
    if (data.length === 0) return;

    if (format === 'csv') {
      let csv = '';
      if (activeTab === 'advances') {
        csv = 'Employee,Amount,Date,Reason,Status\n' + advances.map(a => `${a.employee?.name},${a.amount},${a.date},${a.reason || ''},${a.status}`).join('\n');
      } else if (activeTab === 'salaries') {
        csv = 'Employee,Base Salary,Effective Date,Notes\n' + salaries.map(s => `${s.employee?.name},${s.base_salary},${s.effective_date},${s.notes || ''}`).join('\n');
      } else {
        csv = 'Employee,Period,Amount,Deductions,Bonuses,Net Amount,Payment Date\n' + payouts.map(p => `${p.employee?.name},${p.period_start} - ${p.period_end},${p.amount},${p.deductions},${p.bonuses},${p.net_amount},${p.payment_date}`).join('\n');
      }
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', `payroll_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      // PDF Export
      import('jspdf').then(jsPDFModule => {
        import('jspdf-autotable').then(() => {
          const doc = new jsPDFModule.default();
          const title = activeTab.charAt(0).toUpperCase() + activeTab.slice(1) + ' Report';
          
          // Header
          doc.setFontSize(20);
          doc.text('TEMEH Cold Store', 105, 15, { align: 'center' });
          doc.setFontSize(14);
          doc.text(title, 105, 25, { align: 'center' });
          doc.setFontSize(10);
          doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 32, { align: 'center' });
          
          let headers: string[][] = [];
          let rows: any[][] = [];
          
          if (activeTab === 'advances') {
            headers = [['Employee', 'Amount', 'Date', 'Reason', 'Status']];
            rows = advances.map(a => [a.employee?.name, formatCurrency(a.amount), new Date(a.date).toLocaleDateString(), a.reason || '-', a.status]);
          } else if (activeTab === 'salaries') {
            headers = [['Employee', 'Base Salary', 'Effective Date', 'Notes']];
            rows = salaries.map(s => [s.employee?.name, formatCurrency(s.base_salary), new Date(s.effective_date).toLocaleDateString(), s.notes || '-']);
          } else {
            headers = [['Employee', 'Period', 'Net Amount', 'Date']];
            rows = payouts.map(p => [p.employee?.name, `${new Date(p.period_start).toLocaleDateString()} - ${new Date(p.period_end).toLocaleDateString()}`, formatCurrency(p.net_amount), new Date(p.payment_date).toLocaleDateString()]);
          }
          
          (doc as any).autoTable({
            head: headers,
            body: rows,
            startY: 40,
            theme: 'striped',
            headStyles: { fillColor: [15, 23, 42] }
          });
          
          // Footer
          const pageCount = (doc as any).internal.getNumberOfPages();
          for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            doc.text(`Page ${i} of ${pageCount}`, 105, doc.internal.pageSize.height - 10, { align: 'center' });
          }
          
          doc.save(`payroll_${activeTab}_${new Date().toISOString().split('T')[0]}.pdf`);
        });
      });
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header title={t('payroll.title')} />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 container mx-auto">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-headline">{t('payroll.management')}</h1>
          <p className="text-muted-foreground">{t('payroll.description')}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('payroll.pendingAdvances')}</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(advances.filter(a => a.status === 'pending').reduce((sum, a) => sum + a.amount, 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              {advances.filter(a => a.status === 'pending').length} {t('dashboard.pending').toLowerCase()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('payroll.totalPayouts')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(payouts.reduce((sum, p) => sum + p.net_amount, 0))}
            </div>
            <p className="text-xs text-muted-foreground">{payouts.length} {t('payroll.payouts').toLowerCase()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('payroll.activeStaff')}</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staff.length}</div>
            <p className="text-xs text-muted-foreground">{t('payroll.employeesOnPayroll')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="advances">{t('payroll.advances')}</TabsTrigger>
          <TabsTrigger value="salaries">{t('payroll.salaries')}</TabsTrigger>
          <TabsTrigger value="payouts">{t('payroll.payouts')}</TabsTrigger>
        </TabsList>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>Export CSV</Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>Export PDF</Button>
        </div>

        {/* Advances Tab */}
        <TabsContent value="advances" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">{t('payroll.advances')}</h2>
            <Dialog open={showAdvanceDialog} onOpenChange={setShowAdvanceDialog}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" /> {t('payroll.newAdvance')}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingAdvance ? 'Edit Advance' : t('payroll.recordAdvance')}</DialogTitle>
                  <DialogDescription>
                    {editingAdvance ? 'Update employee advance details' : 'Record a new employee advance request'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t('payroll.employee')}</Label>
                    <Select value={advanceForm.employee_id} onValueChange={(val) => setAdvanceForm(prev => ({ ...prev, employee_id: val }))}>
                      <SelectTrigger><SelectValue placeholder={t('staff.searchPlaceholder')} /></SelectTrigger>
                      <SelectContent>
                        {staff.map(s => (
                          <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('payroll.amount')} ({currencySymbol})</Label>
                    <Input type="number" placeholder="0" value={advanceForm.amount} onChange={(e) => setAdvanceForm(prev => ({ ...prev, amount: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('payroll.date')}</Label>
                    <Input type="date" value={advanceForm.date} onChange={(e) => setAdvanceForm(prev => ({ ...prev, date: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('payroll.reason')}</Label>
                    <Textarea placeholder={t('common.reason')} value={advanceForm.reason} onChange={(e) => setAdvanceForm(prev => ({ ...prev, reason: e.target.value }))} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAdvanceDialog(false)}>{t('common.cancel')}</Button>
                  <Button onClick={handleAddAdvance}>{t('common.save')}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('payroll.employee')}</TableHead>
                  <TableHead>{t('payroll.amount')}</TableHead>
                  <TableHead>{t('payroll.date')}</TableHead>
                  <TableHead>{t('payroll.reason')}</TableHead>
                  <TableHead>{t('payroll.status')}</TableHead>
                  <TableHead className="text-right">{t('payroll.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {advances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No advances recorded yet
                    </TableCell>
                  </TableRow>
                ) : (
                  advances.map(adv => (
                    <TableRow key={adv.id}>
                      <TableCell className="font-medium">{adv.employee?.name || '-'}</TableCell>
                      <TableCell>{formatCurrency(adv.amount)}</TableCell>
                      <TableCell>{new Date(adv.date).toLocaleDateString()}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{adv.reason || '-'}</TableCell>
                      <TableCell>{getStatusBadge(adv.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          {adv.status === 'pending' && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => {
                                setEditingAdvance(adv);
                                setAdvanceForm({
                                  employee_id: String(adv.employee_id),
                                  amount: String(adv.amount),
                                  date: adv.date,
                                  reason: adv.reason || ''
                                });
                                setShowAdvanceDialog(true);
                              }}>Edit</Button>
                              <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700" onClick={async () => {
                                await fetch('/api/payroll/advances', {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ id: adv.id, status: 'approved' })
                                });
                                fetchData();
                              }}>Approve</Button>
                            </>
                          )}
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete('advances', adv.id)}>Delete</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Salaries Tab */}
        <TabsContent value="salaries" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">{t('payroll.salaries')}</h2>
            <Dialog open={showSalaryDialog} onOpenChange={setShowSalaryDialog}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" /> {t('payroll.setSalary')}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingSalary ? 'Edit Salary' : t('payroll.setSalary')}</DialogTitle>
                  <DialogDescription>
                    {editingSalary ? 'Update employee salary details' : 'Set or update an employee\'s base salary'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t('payroll.employee')}</Label>
                    <Select value={salaryForm.employee_id} onValueChange={(val) => setSalaryForm(prev => ({ ...prev, employee_id: val }))}>
                      <SelectTrigger><SelectValue placeholder={t('common.search')} /></SelectTrigger>
                      <SelectContent>
                        {staff.map(s => (
                          <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Base Salary ({currencySymbol})</Label>
                    <Input type="number" placeholder="0" value={salaryForm.base_salary} onChange={(e) => setSalaryForm(prev => ({ ...prev, base_salary: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('payroll.effectiveDate') || 'Effective Date'}</Label>
                    <Input type="date" value={salaryForm.effective_date} onChange={(e) => setSalaryForm(prev => ({ ...prev, effective_date: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('common.notes')} ({t('common.optional') || 'Optional'})</Label>
                    <Textarea placeholder={t('common.notes')} value={salaryForm.notes} onChange={(e) => setSalaryForm(prev => ({ ...prev, notes: e.target.value }))} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowSalaryDialog(false)}>{t('common.cancel')}</Button>
                  <Button onClick={handleSetSalary}>{t('common.save')}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Base Salary</TableHead>
                  <TableHead>Effective Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salaries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No salary records yet
                    </TableCell>
                  </TableRow>
                ) : (
                  salaries.map(sal => (
                    <TableRow key={sal.id}>
                      <TableCell className="font-medium">{sal.employee?.name || '-'}</TableCell>
                      <TableCell>{formatCurrency(sal.base_salary)}</TableCell>
                      <TableCell>{new Date(sal.effective_date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" onClick={() => {
                            setEditingSalary(sal);
                            setSalaryForm({
                              employee_id: String(sal.employee_id),
                              base_salary: String(sal.base_salary),
                              effective_date: sal.effective_date,
                              notes: sal.notes || ''
                            });
                            setShowSalaryDialog(true);
                          }}>Edit</Button>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete('salaries', sal.id)}>Delete</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Payouts Tab */}
        <TabsContent value="payouts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Payout History</h2>
            <Dialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog}>
              <DialogTrigger asChild>
                <Button><CreditCard className="h-4 w-4 mr-2" /> Record Payout</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingPayout ? 'Edit Payout' : 'Record Payout'}</DialogTitle>
                  <DialogDescription>
                    {editingPayout ? 'Update payout details' : 'Record a salary payout to an employee'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Employee</Label>
                    <Select value={payoutForm.employee_id} onValueChange={(val) => setPayoutForm(prev => ({ ...prev, employee_id: val }))}>
                      <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                      <SelectContent>
                        {staff.map(s => (
                          <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Period Start</Label>
                      <Input type="date" value={payoutForm.period_start} onChange={(e) => setPayoutForm(prev => ({ ...prev, period_start: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Period End</Label>
                      <Input type="date" value={payoutForm.period_end} onChange={(e) => setPayoutForm(prev => ({ ...prev, period_end: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Base Amount</Label>
                      <Input type="number" placeholder="0" value={payoutForm.amount} onChange={(e) => setPayoutForm(prev => ({ ...prev, amount: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Deductions</Label>
                      <Input type="number" placeholder="0" value={payoutForm.deductions} onChange={(e) => setPayoutForm(prev => ({ ...prev, deductions: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Bonuses</Label>
                      <Input type="number" placeholder="0" value={payoutForm.bonuses} onChange={(e) => setPayoutForm(prev => ({ ...prev, bonuses: e.target.value }))} />
                    </div>
                  </div>
                  {payoutForm.amount && (
                    <div className="p-3 bg-muted rounded-md text-sm">
                      <span className="font-medium">{t('payroll.netAmount')}: </span>
                      {formatCurrency((parseFloat(payoutForm.amount) || 0) - (parseFloat(payoutForm.deductions) || 0) + (parseFloat(payoutForm.bonuses) || 0))}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>{t('payroll.paymentDate')}</Label>
                    <Input type="date" value={payoutForm.payment_date} onChange={(e) => setPayoutForm(prev => ({ ...prev, payment_date: e.target.value }))} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowPayoutDialog(false)}>{t('common.cancel')}</Button>
                  <Button onClick={handleAddPayout}>{t('payroll.recordPayout')}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Base</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Bonuses</TableHead>
                  <TableHead>Net Amount</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No payouts recorded yet
                    </TableCell>
                  </TableRow>
                ) : (
                  payouts.map(pay => (
                    <TableRow key={pay.id}>
                      <TableCell className="font-medium">{pay.employee?.name || '-'}</TableCell>
                      <TableCell>
                        {new Date(pay.period_start).toLocaleDateString()} - {new Date(pay.period_end).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{formatCurrency(pay.amount)}</TableCell>
                      <TableCell className="text-destructive">-{formatCurrency(pay.deductions)}</TableCell>
                      <TableCell className="text-green-600">+{formatCurrency(pay.bonuses)}</TableCell>
                      <TableCell className="font-bold">{formatCurrency(pay.net_amount)}</TableCell>
                      <TableCell>{new Date(pay.payment_date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" onClick={() => {
                            setEditingPayout(pay);
                            setPayoutForm({
                              employee_id: String(pay.employee_id),
                              amount: String(pay.amount),
                              period_start: pay.period_start,
                              period_end: pay.period_end,
                              deductions: String(pay.deductions),
                              bonuses: String(pay.bonuses),
                              payment_date: pay.payment_date
                            });
                            setShowPayoutDialog(true);
                          }}>Edit</Button>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete('payouts', pay.id)}>Delete</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
        </div>
      </main>
    </div>
  );
}
