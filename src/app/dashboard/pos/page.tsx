"use client"

import { useState, useMemo, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/dashboard/header'
import { OrderSummary, type OrderItem } from '@/components/dashboard/pos/order-summary'
import { useInventory } from '@/context/inventory-context'
import { useAuth } from '@/context/auth-context'
import { useToast } from '@/hooks/use-toast'
import { useStaff } from '@/context/staff-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock, Package, Search, ShoppingCart, Clock, Plus, Receipt, TrendingDown, Calendar, Tag, FileText, X } from 'lucide-react'
import { useTranslation } from '@/hooks/use-translation'
import type { PaymentDetails } from '@/components/dashboard/pos/payment-dialog'
import { Button } from '@/components/ui/button'
import { PageOnboarding } from '@/components/dashboard/onboarding/page-onboarding'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import { useSettings } from '@/context/settings-context'
import { formatCurrency, calculateTotal } from '@/lib/utils'
import { HeldCartsDialog } from '@/components/dashboard/pos/held-cart-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import type { InventoryItem } from '@/lib/db/inventory'
import { NumericKeypad } from '@/components/dashboard/pos/numeric-keypad'

function PosPageContent() {
  const router = useRouter()
  const [cartItems, setCartItems] = useState<OrderItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isHeldCartsOpen, setIsHeldCartsOpen] = useState(false)
  const [quantityDialogOpen, setQuantityDialogOpen] = useState(false)
  const [selectedPosItem, setSelectedPosItem] = useState<typeof inventoryItems[0] | null>(null)
  const [quantityInput, setQuantityInput] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const { user } = useAuth()
  const { toast } = useToast()
  const { items: inventoryItems, addMovement, categories } = useInventory()
  const { staff } = useStaff()
  const { t } = useTranslation()
  const { settings } = useSettings()

  // Filter sellable inventory items (with price > 0 and in stock)
  const sellableItems = useMemo(() => {
    return inventoryItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
      // Use selling_price if available, otherwise fall back to cost_per_unit
      const itemPrice = item.selling_price || item.cost_per_unit
      const hasPrice = itemPrice && itemPrice > 0
      return matchesSearch && matchesCategory && hasPrice
    })
  }, [inventoryItems, searchQuery, selectedCategory])

  // Get unique categories from inventory
  const availableCategories = useMemo(() => {
    const cats = new Set(inventoryItems.map(item => item.category).filter(Boolean))
    return Array.from(cats)
  }, [inventoryItems])

  const handleProductClick = (item: typeof inventoryItems[0]) => {
    if (item.current_stock <= 0) {
      toast({
        variant: "destructive",
        title: t('toasts.error'),
        description: `${item.name} is out of stock.`,
      })
      return
    }

    // Open quantity dialog for all items
    setSelectedPosItem(item)
    setQuantityInput(item.unit_type === 'Kilo' ? '' : '1')
    setQuantityDialogOpen(true)
  }

  const handleAddToCartWithQuantity = () => {
    if (!selectedPosItem) return
    const qty = parseFloat(quantityInput)
    if (!qty || qty <= 0) {
      toast({ variant: "destructive", title: t('toasts.error'), description: 'Please enter a valid quantity.' })
      return
    }
    if (qty > selectedPosItem.current_stock) {
      toast({ variant: "destructive", title: t('toasts.error'), description: `Only ${selectedPosItem.current_stock} ${selectedPosItem.unit_type === 'Kilo' ? 'kg' : 'units'} available.` })
      return
    }

    setCartItems((prevItems) => {
      const targetId = `inv_${selectedPosItem.id}`
      const existingItem = prevItems.find((cartItem) => cartItem.id === targetId)
      if (existingItem) {
        const newQty = existingItem.quantity + qty
        if (newQty > selectedPosItem.current_stock) {
          toast({ variant: "destructive", title: t('toasts.error'), description: `Only ${selectedPosItem.current_stock} ${selectedPosItem.unit_type === 'Kilo' ? 'kg' : 'units'} available.` })
          return prevItems
        }
        return prevItems.map((cartItem) =>
          cartItem.id === targetId
            ? { ...cartItem, quantity: newQty }
            : cartItem
        )
      }
      return [...prevItems, {
        id: targetId,
        name: selectedPosItem.name,
        price: selectedPosItem.selling_price || 0,
        quantity: qty,
        category: selectedPosItem.category || '',
        image: selectedPosItem.image || "https://placehold.co/150x150.png",
        unit_type: selectedPosItem.unit_type || 'Piece',
        max_stock: selectedPosItem.current_stock
      }]
    })

    setQuantityDialogOpen(false)
    setSelectedPosItem(null)
    setQuantityInput('')
  }

  const handleUpdateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      setCartItems(prev => prev.filter(item => item.id !== id))
      return
    }

    const inventoryItem = inventoryItems.find(item => String(item.id) === id)
    if (inventoryItem && quantity > inventoryItem.current_stock) {
      toast({
        variant: "destructive",
        title: t('toasts.error'),
        description: `Only ${inventoryItem.current_stock} units available.`,
      })
      return
    }

    setCartItems(prev =>
      prev.map(item => item.id === id ? { ...item, quantity } : item)
    )
  }

  const handleClearCart = () => {
    setCartItems([])
  }

  const handleCompleteSale = async (paymentDetails: PaymentDetails) => {
    if (!user) return
    if (cartItems.length === 0) return

    setIsProcessing(true)

    try {
      const currentStaff = staff.find(s => s.email === user.email)
      const userId = currentStaff ? parseInt(currentStaff.id) : undefined

      // Record the sale (this also deducts inventory stock in addOrder)
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'POS',
          items: cartItems,
          status: 'Completed',
          cashier_id: userId,
          subtotal: paymentDetails.subtotal,
          tax: paymentDetails.tax,
          discount: paymentDetails.discount,
          discountName: paymentDetails.discountName,
          total: paymentDetails.total,
          payment_method: paymentDetails.paymentMethod
        })
      })

      if (!res.ok) {
        throw new Error("Failed to save order");
      }

      toast({
        title: t('pos.saleComplete') || 'Sale Complete',
        description: `Total: ${formatCurrency(paymentDetails?.total || 0, settings.defaultCurrency || 'XAF')}`,
      })

      handleClearCart()
    } catch (error) {
      console.error('Sale failed:', error)
      toast({
        variant: "destructive",
        title: t('toasts.error'),
        description: 'Failed to complete sale. Please try again.',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSuspendOrder = async () => {
    if (cartItems.length === 0) return;
    
    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const defaultTaxRate = settings.taxRates.find(rate => rate.isDefault)?.rate || 0
    const { total, tax } = calculateTotal(subtotal, settings.taxEnabled ? defaultTaxRate : 0, 'percentage', 0)

    try {
        const currentStaff = staff.find(s => s.email === user?.email)
        const res = await fetch('/api/held-carts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items: cartItems,
                subtotal,
                tax_amount: tax,
                total,
                user_id: currentStaff ? parseInt(currentStaff.id) : undefined,
                notes: `Suspended at ${new Date().toLocaleTimeString()}`
            })
        });

        if (res.ok) {
            toast({ title: "Sale Suspended", description: "Order saved for later." });
            setCartItems([]);
        } else {
            throw new Error("Failed to suspend");
        }
    } catch (error) {
        toast({ title: "Error", description: "Could not suspend sale.", variant: "destructive" });
    }
  }

  const handleResumeCart = async (cart: any) => {
      try {
          const restoredItems = cart.items.map((item: any) => ({
              ...item,
              id: String(item.id),
              image: item.image || "https://placehold.co/150x150.png"
          }));
          setCartItems(restoredItems);
          setIsHeldCartsOpen(false);
          
          const res = await fetch(`/api/held-carts/${cart.id}`, { method: 'DELETE' });
          if (res.ok) {
              toast({ title: "Sale Resumed", description: "Cart restored." });
          } else {
              toast({ title: "Note", description: "Cart restored, but could not remove suspended entry.", variant: "default" });
          }
      } catch (error) {
          console.error("Error resuming cart:", error);
          toast({ title: "Error", description: "Failed to resume cart properly.", variant: "destructive" });
      }
  }

  const canViewPage = () => {
    if (!user) return false
    const allowedRoles = ["Cashier", "Manager", "Super Admin"]
    return allowedRoles.includes(user.role)
  }

  if (!mounted) return null

  if (!canViewPage()) {
    return (
      <div className="flex min-h-screen w-full flex-col" suppressHydrationWarning>
        <Header title={t('pos.title')} />
        <main className="flex flex-1 flex-col items-center justify-center p-4 md:p-8">
          <Card className="flex flex-col items-center justify-center p-10 text-center">
            <CardHeader>
              <div className="mx-auto bg-muted rounded-full p-4">
                <Lock className="h-12 w-12 text-muted-foreground" />
              </div>
              <CardTitle className="mt-4">{t('pos.accessDeniedTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{t('pos.accessDeniedDescription')}</p>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  const getStockBadge = (stock: number, minStock: number = 10) => {
    if (stock <= 0) return <Badge variant="secondary" className="bg-slate-200 text-slate-500">Out of Stock</Badge>
    if (stock <= minStock) return <Badge variant="secondary" className="bg-red-500/10 text-red-600 border-red-200">Low: {stock}</Badge>
    return <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-200">In Stock: {stock}</Badge>
  }

  return (
    <div className="flex h-screen w-full flex-col" suppressHydrationWarning>
      <PageOnboarding page="pos" />
      <Header title={t('pos.title')}>
          <Button variant="outline" size="sm" className="hidden md:flex gap-2" onClick={() => setIsHeldCartsOpen(true)}>
             <Clock className="h-4 w-4" />
             {t('pos.suspendedSales') || "Suspended Sales"}
          </Button>
      </Header>
      <main className="flex flex-1 flex-col md:flex-row overflow-hidden">
        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('pos.searchProducts') || 'Search products...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {availableCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Products Grid */}
          {sellableItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No products match your search' : 'No sellable products available'}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Add products with selling prices in Inventory
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {sellableItems.map((item) => (
                <Card
                  key={item.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    item.current_stock <= 0 
                      ? 'opacity-60 grayscale cursor-not-allowed bg-slate-50' 
                      : 'hover:border-primary'
                  }`}
                  onClick={() => item.current_stock > 0 && handleProductClick(item)}
                >
                  <div className="aspect-square relative overflow-hidden rounded-t-lg bg-muted/50">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Package className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-medium text-sm truncate">{item.name}</h3>
                    <p className="text-xs text-muted-foreground truncate">{item.category}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-bold text-primary">
                        {formatCurrency(item.selling_price || 0, settings.defaultCurrency)}
                      </span>
                      {item.unit_type && (
                        <span className="text-xs text-muted-foreground">/{item.unit_type}</span>
                      )}
                    </div>
                    <div className="mt-2">
                      {getStockBadge(item.current_stock, item.min_stock_level)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Cart Summary */}
        <div className="w-full md:w-80 lg:w-96 border-t md:border-t-0 md:border-l bg-card flex flex-col h-auto md:h-full overflow-hidden">
          <div className="flex-none p-4 border-b flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              <h2 className="text-lg font-bold">{t('pos.cart') || 'Cart'}</h2>
              {cartItems.length > 0 && (
                <Badge variant="secondary">{cartItems.length}</Badge>
              )}
            </div>
             <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsHeldCartsOpen(true)}>
                 <Clock className="h-5 w-5" />
             </Button>
          </div>
          <div className="flex-1 overflow-hidden">
            <OrderSummary
              items={cartItems}
              onUpdateQuantity={handleUpdateQuantity}
              onClearOrder={handleClearCart}
              onPaymentSuccess={handleCompleteSale}
              onPlaceOrder={() => {}}
              onSuspendOrder={handleSuspendOrder}
              isPlacingOrder={isProcessing}
              hidePlaceOrderButton={true}
            />
          </div>
        </div>
      </main>
      <HeldCartsDialog 
        open={isHeldCartsOpen} 
        onOpenChange={setIsHeldCartsOpen} 
        onResumeCart={handleResumeCart}
      />

      {/* Quantity Input Dialog */}
      <Dialog open={quantityDialogOpen} onOpenChange={setQuantityDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('pos.addToCartTitle') || `Add ${selectedPosItem?.name || 'Item'} to Cart`}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                <span className="text-sm text-muted-foreground">{t('pos.pricePerUnit') || `Price per ${selectedPosItem?.unit_type === 'Kilo' ? 'kg' : 'unit'}`}</span>
                <span className="font-bold text-primary">{formatCurrency(selectedPosItem?.selling_price || 0, settings.defaultCurrency)}</span>
              </div>
              <div className="space-y-2">
                <Label>{t('pos.quantityLabel') || 'Quantity'} ({selectedPosItem?.unit_type === 'Kilo' ? 'kg' : 'units'})</Label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder={selectedPosItem?.unit_type === 'Kilo' ? '0.00' : '0'}
                    value={quantityInput}
                    onChange={(e) => setQuantityInput(e.target.value)}
                    autoFocus
                    className="text-2xl font-bold h-14 text-center"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddToCartWithQuantity() }}
                  />
                  {quantityInput && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => setQuantityInput('')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{t('inventory.stock')}: {selectedPosItem?.current_stock} {selectedPosItem?.unit_type === 'Kilo' ? 'kg' : 'units'}</p>
              </div>
              {quantityInput && parseFloat(quantityInput) > 0 && (
                <div className={`flex items-center justify-between p-3 rounded-md border ${parseFloat(quantityInput) > (selectedPosItem?.current_stock || 0) ? 'bg-destructive/10 border-destructive/20' : 'bg-primary/10 border-primary/20'}`}>
                  <span className="font-medium text-sm">{t('pos.total')}</span>
                  <div className="text-right">
                    <span className={`text-lg font-bold ${parseFloat(quantityInput) > (selectedPosItem?.current_stock || 0) ? 'text-destructive' : 'text-primary'}`}>
                      {formatCurrency((parseFloat(quantityInput) || 0) * (selectedPosItem?.selling_price || 0), settings.defaultCurrency)}
                    </span>
                    {parseFloat(quantityInput) > (selectedPosItem?.current_stock || 0) && (
                      <p className="text-[10px] text-destructive font-bold uppercase mt-1">Exceeds Stock</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
              <NumericKeypad 
                onInput={(val) => {
                  const newVal = quantityInput + val;
                  // Prevent entering astronomical numbers for safety
                  if (newVal.length > 10) return;
                  setQuantityInput(newVal);
                }}
                onClear={() => setQuantityInput('')}
                onDelete={() => setQuantityInput(prev => prev.slice(0, -1))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => {
              setQuantityDialogOpen(false);
              setQuantityInput('');
            }}>{t('common.cancel')}</Button>
            <Button 
              onClick={handleAddToCartWithQuantity} 
              className="w-full sm:w-auto"
              disabled={!quantityInput || parseFloat(quantityInput) <= 0 || parseFloat(quantityInput) > (selectedPosItem?.current_stock || 0)}
            >
              {t('pos.addToCart') || 'Add to Cart'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function PosPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PosPageContent />
    </Suspense>
  )
}
