"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { useTranslation } from '@/hooks/use-translation'
import { useLanguage } from '@/context/language-context'

type Event = {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  location: string;
  capacity: number;
}

export function DashboardCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { t } = useTranslation();
  const { language } = useLanguage();

  const locale = language === 'fr' ? 'fr-FR' : 'en-US';

  // Fetch events from database
  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/events');
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      } else {
        throw new Error('Failed to fetch events');
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
      toast({
        variant: "destructive",
        title: t('common.error') || "Error",
        description: t('dashboard.loadingEvents') || "Failed to load events"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    // Use UTC dates to avoid timezone issues
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    
    return events.filter(event => {
      const eventDate = new Date(event.start_date);
      return eventDate.getFullYear() === year &&
             eventDate.getMonth() === month &&
             eventDate.getDate() === day;
    });
  };

  // Get upcoming events (next 7 days)
  const getUpcomingEvents = () => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    return events.filter(event => {
      const eventDate = new Date(event.start_date);
      return eventDate >= today && eventDate <= nextWeek;
    }).sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const getMonthName = (date: Date) => {
    return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const isToday = (day: number) => {
    const today = new Date();
    return currentDate.getFullYear() === today.getFullYear() &&
           currentDate.getMonth() === today.getMonth() &&
           day === today.getDate();
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return currentDate.getFullYear() === selectedDate.getFullYear() &&
           currentDate.getMonth() === selectedDate.getMonth() &&
           day === selectedDate.getDate();
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
  const daysOfWeek = [
    t('dashboard.calendar.sun') || 'Sun',
    t('dashboard.calendar.mon') || 'Mon',
    t('dashboard.calendar.tue') || 'Tue',
    t('dashboard.calendar.wed') || 'Wed',
    t('dashboard.calendar.thu') || 'Thu',
    t('dashboard.calendar.fri') || 'Fri',
    t('dashboard.calendar.sat') || 'Sat'
  ];

  const renderCalendarDays = () => {
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-8" />);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayEvents = getEventsForDate(dayDate);
      const hasEvents = dayEvents.length > 0;
      
      days.push(
        <div key={day} className="flex justify-center items-center h-8">
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 w-8 p-0 font-normal",
                isToday(day) && "bg-primary text-primary-foreground hover:bg-primary/90",
                isSelected(day) && !isToday(day) && "bg-accent text-accent-foreground",
                "hover:bg-accent hover:text-accent-foreground"
              )}
              onClick={() => setSelectedDate(dayDate)}
            >
              {day}
            </Button>
            {hasEvents && (
              <div className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-red-500 rounded-full border border-background"></div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="font-semibold">{getMonthName(currentDate)}</h3>
          <Button variant="outline" size="sm" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={goToToday}>
          {t('periods.today')}
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="space-y-2">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {daysOfWeek.map(day => (
            <div key={day} className="text-xs font-medium text-muted-foreground py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {renderCalendarDays()}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-2 pt-4 border-t">
        <Button 
          size="sm" 
          className="flex items-center gap-1"
          onClick={() => window.location.href = '/dashboard/events'}
        >
          <Plus className="h-3 w-3" />
          {t('dashboard.addEvent')}
        </Button>
        {selectedDate && (
          <div className="text-sm text-muted-foreground">
            {t('dashboard.selected')}: {selectedDate.toLocaleDateString(locale)}
          </div>
        )}
      </div>

      {/* Events List */}
      <Card className="border-none shadow-none bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-xs uppercase tracking-wider text-muted-foreground">
              {selectedDate ? `Events for ${selectedDate.toLocaleDateString(locale)}` : t('dashboard.upcomingEvents')}
            </h4>
            {selectedDate && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-[10px] text-muted-foreground"
                onClick={() => setSelectedDate(null)}
              >
                Clear
              </Button>
            )}
          </div>
          
          {loading ? (
            <div className="text-xs text-muted-foreground py-2 italic">{t('dashboard.loadingEvents')}</div>
          ) : (selectedDate ? events.filter(e => {
              const ed = new Date(e.start_date);
              return ed.getFullYear() === selectedDate.getFullYear() &&
                     ed.getMonth() === selectedDate.getMonth() &&
                     ed.getDate() === selectedDate.getDate();
            }) : getUpcomingEvents()).length === 0 ? (
            <div className="text-xs text-muted-foreground py-2 italic">
                {selectedDate ? "No events for this date" : t('dashboard.noEvents')}
            </div>
          ) : (
            <div className="space-y-2 max-h-[160px] overflow-y-auto hide-scrollbar">
              {(selectedDate ? events.filter(e => {
                  const ed = new Date(e.start_date);
                  return ed.getFullYear() === selectedDate.getFullYear() &&
                         ed.getMonth() === selectedDate.getMonth() &&
                         ed.getDate() === selectedDate.getDate();
                }) : getUpcomingEvents()).map(event => (
                <div key={event.id} className="flex items-start gap-2 p-2 rounded-md bg-background/50 hover:bg-background transition-colors border border-transparent hover:border-border/50">
                  <Calendar className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm leading-tight">{event.title}</div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {new Date(event.start_date).toLocaleTimeString(locale, {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                      {event.location && (
                        <>
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{event.location}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 