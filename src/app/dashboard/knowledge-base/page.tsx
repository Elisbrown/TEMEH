
"use client"

import { useState } from 'react'
import { Header } from '@/components/dashboard/header'
import { Input } from '@/components/ui/input'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { useTranslation } from '@/hooks/use-translation'
import { Search } from 'lucide-react'

type KBArticle = {
  titleKey: string
  contentKey: string
}

type KBCategory = {
  titleKey: string
  articles: KBArticle[]
}

const knowledgeBaseContent: KBCategory[] = [
  {
    titleKey: 'kb.gettingStarted.title',
    articles: [
      { titleKey: 'kb.gettingStarted.overview.title', contentKey: 'kb.gettingStarted.overview.content' },
      { titleKey: 'kb.gettingStarted.roles.title', contentKey: 'kb.gettingStarted.roles.content' },
      { titleKey: 'kb.gettingStarted.firstLogin.title', contentKey: 'kb.gettingStarted.firstLogin.content' },
    ],
  },
  {
    titleKey: 'kb.pos.title',
    articles: [
      { titleKey: 'kb.pos.takingOrders.title', contentKey: 'kb.pos.takingOrders.content' },
      { titleKey: 'kb.pos.managingOrders.title', contentKey: 'kb.pos.managingOrders.content' },
      { titleKey: 'kb.pos.processingPayments.title', contentKey: 'kb.pos.processingPayments.content' },
      { titleKey: 'kb.pos.splitMerge.title', contentKey: 'kb.pos.splitMerge.content' },
    ],
  },
  {
    titleKey: 'kb.inventory.title',
    articles: [
      { titleKey: 'kb.inventory.managingMeals.title', contentKey: 'kb.inventory.managingMeals.content' },
      { titleKey: 'kb.inventory.managingIngredients.title', contentKey: 'kb.inventory.managingIngredients.content' },
      { titleKey: 'kb.inventory.csv.title', contentKey: 'kb.inventory.csv.content' },
    ],
  },
  {
    titleKey: 'kb.management.title',
    articles: [
      { titleKey: 'kb.management.floorsTables.title', contentKey: 'kb.management.floorsTables.content' },
      { titleKey: 'kb.management.staff.title', contentKey: 'kb.management.staff.content' },
      { titleKey: 'kb.management.serviceProviders.title', contentKey: 'kb.management.serviceProviders.content' },
      { titleKey: 'kb.management.categories.title', contentKey: 'kb.management.categories.content' },
    ],
  },
   {
    titleKey: 'kb.accounting.title',
    articles: [
      { titleKey: 'kb.accounting.overview.title', contentKey: 'kb.accounting.overview.content' },
      { titleKey: 'kb.accounting.dashboard.title', contentKey: 'kb.accounting.dashboard.content' },
      { titleKey: 'kb.accounting.journals.title', contentKey: 'kb.accounting.journals.content' },
      { titleKey: 'kb.accounting.coa.title', contentKey: 'kb.accounting.coa.content' },
    ],
  },
  {
    titleKey: 'kb.system.title',
    articles: [
      { titleKey: 'kb.system.configuration.title', contentKey: 'kb.system.configuration.content' },
      { titleKey: 'kb.system.backup.title', contentKey: 'kb.system.backup.content' },
      { titleKey: 'kb.system.activityLog.title', contentKey: 'kb.system.activityLog.content' },
    ],
  },
  {
    titleKey: 'kb.ticketing.title',
    articles: [
      { titleKey: 'kb.ticketing.creating.title', contentKey: 'kb.ticketing.creating.content' },
      { titleKey: 'kb.ticketing.managing.title', contentKey: 'kb.ticketing.managing.content' },
    ],
  },
]

export default function KnowledgeBasePage() {
  const { t } = useTranslation()
  const [searchTerm, setSearchTerm] = useState('')

  const filteredContent = knowledgeBaseContent.map(category => {
    const filteredArticles = category.articles.filter(article => 
      t(article.titleKey).toLowerCase().includes(searchTerm.toLowerCase()) ||
      t(article.contentKey).toLowerCase().includes(searchTerm.toLowerCase())
    );
    return { ...category, articles: filteredArticles };
  }).filter(category => category.articles.length > 0);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <div className="sticky top-0 z-50 bg-background border-b">
        <Header title={t('kb.title')} />
      </div>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="mx-auto w-full max-w-4xl">
            <div className="mb-6">
                <h1 className="text-3xl font-bold font-headline text-center">{t('kb.mainHeader')}</h1>
                <p className="text-muted-foreground text-center mt-2">{t('kb.mainSubheader')}</p>
            </div>
            <div className="relative mb-8">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder={t('kb.searchPlaceholder')}
                    className="w-full pl-10 py-6 text-base"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            {filteredContent.length > 0 ? (
                filteredContent.map(category => (
                    <div key={category.titleKey} className="mb-6">
                        <h2 className="text-2xl font-semibold font-headline mb-4">{t(category.titleKey)}</h2>
                        <Accordion type="multiple" className="w-full">
                            {category.articles.map(article => (
                                <AccordionItem key={article.titleKey} value={article.titleKey}>
                                    <AccordionTrigger className="text-lg hover:no-underline">{t(article.titleKey)}</AccordionTrigger>
                                    <AccordionContent className="prose prose-invert max-w-none text-muted-foreground whitespace-pre-line">
                                        {t(article.contentKey)}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                ))
            ) : (
                <div className="text-center py-10">
                    <p className="text-lg font-medium">{t('kb.noResults')}</p>
                    <p className="text-muted-foreground mt-2">{t('kb.tryDifferentSearch')}</p>
                </div>
            )}
        </div>
      </main>
    </div>
  )
}
