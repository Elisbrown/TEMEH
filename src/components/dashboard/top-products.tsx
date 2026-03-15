
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatCurrency } from "@/lib/utils"
import { useSettings } from "@/context/settings-context"
import { useTranslation } from "@/hooks/use-translation"

type TopProductsProps = {
    products: {
        id: string;
        name: string;
        category: string;
        image: string;
        total_sold?: number;  // From database
        totalSold?: number;   // Legacy format
        total_revenue?: number;  // From database
        totalRevenue?: number;   // Legacy format
    }[];
}

export function TopProducts({ products }: TopProductsProps) {
  const { settings } = useSettings();
  const { t } = useTranslation();
  
  if (!products || products.length === 0) {
    return <div className="text-center text-muted-foreground">{t('dashboard.noProductsSold')}</div>;
  }
  
  return (
    <div className="space-y-8">
        {products.map((product, index) => {
            // Handle both database format (total_sold) and legacy format (totalSold)
            const sold = product.total_sold ?? product.totalSold ?? 0;
            const revenue = product.total_revenue ?? product.totalRevenue ?? 0;
            
            return (
                <div className="flex items-center" key={product.id}>
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={product.image} alt={product.name} data-ai-hint="product" />
                        <AvatarFallback>{product.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="ml-4 space-y-1">
                        <p className="text-sm font-medium leading-none">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.category}</p>
                    </div>
                    <div className="ml-auto text-right">
                        <div className="text-sm font-medium">{sold} {t('dashboard.sold')}</div>
                        <div className="text-xs text-muted-foreground">
                            {formatCurrency(revenue, settings.defaultCurrency)}
                        </div>
                    </div>
                </div>
            );
        })}
    </div>
  )
}
