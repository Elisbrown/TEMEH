
"use client"

import { useState } from "react"
import { Header } from '@/components/dashboard/header'
import { TicketsTable } from '@/components/dashboard/ticketing/tickets-table'
import { AddTicketForm } from '@/components/dashboard/ticketing/add-ticket-form'
import { TicketDetailsDialog } from '@/components/dashboard/ticketing/ticket-details-dialog'
import { useTickets, type Ticket } from "@/context/ticket-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/context/auth-context"
import { useTranslation } from "@/hooks/use-translation"

export default function SupportPage() {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const { user } = useAuth()
  const { addTicket } = useTickets()
  const { t } = useTranslation()

  if (!user) return null

  return (
    <>
      <div className="flex min-h-screen w-full flex-col">
        <Header title={t('support.title')} />
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
          <Card>
              <CardHeader>
                  <div className="flex items-center justify-between">
                      <div>
                          <CardTitle className="font-headline">{t('support.ticketsTitle')}</CardTitle>
                          <CardDescription>
                              {t('support.ticketsDesc')}
                          </CardDescription>
                      </div>
                      <AddTicketForm onAddTicket={addTicket} currentUser={user} />
                  </div>
              </CardHeader>
              <CardContent>
                  <TicketsTable onSelectTicket={setSelectedTicket} />
              </CardContent>
          </Card>
        </main>
      </div>

      {selectedTicket && (
        <TicketDetailsDialog 
          ticket={selectedTicket}
          open={!!selectedTicket}
          onOpenChange={(isOpen) => !isOpen && setSelectedTicket(null)}
        />
      )}
    </>
  )
}
