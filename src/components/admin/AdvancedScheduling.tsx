import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Calendar,
  Clock,
  Globe,
  Repeat,
  Zap,
  Send,
  CalendarDays,
  Timer,
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface AdvancedSchedulingProps {
  scheduleDate: string;
  scheduleTime: string;
  timezone: string;
  sendOptimalTime: boolean;
  recurringEnabled: boolean;
  recurringFrequency: string;
  onScheduleDateChange: (date: string) => void;
  onScheduleTimeChange: (time: string) => void;
  onTimezoneChange: (tz: string) => void;
  onSendOptimalTimeChange: (enabled: boolean) => void;
  onRecurringEnabledChange: (enabled: boolean) => void;
  onRecurringFrequencyChange: (freq: string) => void;
}

const timezones = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
];

const recurringOptions = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
];

const quickScheduleOptions = [
  { label: 'In 1 hour', hours: 1 },
  { label: 'Tomorrow 9 AM', days: 1, time: '09:00' },
  { label: 'Tomorrow 2 PM', days: 1, time: '14:00' },
  { label: 'Next Week', days: 7, time: '09:00' },
];

export function AdvancedScheduling({
  scheduleDate,
  scheduleTime,
  timezone,
  sendOptimalTime,
  recurringEnabled,
  recurringFrequency,
  onScheduleDateChange,
  onScheduleTimeChange,
  onTimezoneChange,
  onSendOptimalTimeChange,
  onRecurringEnabledChange,
  onRecurringFrequencyChange,
}: AdvancedSchedulingProps) {
  const handleQuickSchedule = (option: { hours?: number; days?: number; time?: string }) => {
    const now = new Date();
    let targetDate = now;
    
    if (option.hours) {
      targetDate = new Date(now.getTime() + option.hours * 60 * 60 * 1000);
      onScheduleDateChange(format(targetDate, 'yyyy-MM-dd'));
      onScheduleTimeChange(format(targetDate, 'HH:mm'));
    } else if (option.days) {
      targetDate = addDays(now, option.days);
      onScheduleDateChange(format(targetDate, 'yyyy-MM-dd'));
      onScheduleTimeChange(option.time || '09:00');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Calendar className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <CardTitle className="text-base">Schedule Campaign</CardTitle>
            <CardDescription>Set when to send your campaign</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Quick Schedule Buttons */}
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">Quick Schedule</Label>
          <div className="flex flex-wrap gap-2">
            {quickScheduleOptions.map((option) => (
              <Button
                key={option.label}
                variant="outline"
                size="sm"
                onClick={() => handleQuickSchedule(option)}
              >
                <Zap className="w-3 h-3 mr-1" />
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
              Date
            </Label>
            <Input
              type="date"
              value={scheduleDate}
              onChange={(e) => onScheduleDateChange(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Time
            </Label>
            <Input
              type="time"
              value={scheduleTime}
              onChange={(e) => onScheduleTimeChange(e.target.value)}
              className="mt-1"
              disabled={sendOptimalTime}
            />
          </div>
        </div>

        {/* Timezone */}
        <div>
          <Label className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground" />
            Timezone
          </Label>
          <Select value={timezone} onValueChange={onTimezoneChange}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timezones.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Optimal Send Time */}
        <div className="flex items-center justify-between p-4 rounded-lg border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gold/10">
              <Timer className="w-5 h-5 text-gold" />
            </div>
            <div>
              <p className="font-medium text-sm">Smart Send Time</p>
              <p className="text-xs text-muted-foreground">
                Automatically send at optimal time based on recipient engagement
              </p>
            </div>
          </div>
          <Switch
            checked={sendOptimalTime}
            onCheckedChange={onSendOptimalTimeChange}
          />
        </div>

        {/* Recurring */}
        <div className="p-4 rounded-lg border border-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Repeat className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="font-medium text-sm">Recurring Campaign</p>
                <p className="text-xs text-muted-foreground">
                  Automatically resend on a schedule
                </p>
              </div>
            </div>
            <Switch
              checked={recurringEnabled}
              onCheckedChange={onRecurringEnabledChange}
            />
          </div>

          {recurringEnabled && (
            <div>
              <Label className="text-xs">Frequency</Label>
              <Select value={recurringFrequency} onValueChange={onRecurringFrequencyChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {recurringOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Schedule Preview */}
        {scheduleDate && scheduleTime && (
          <div className="p-4 rounded-lg bg-accent/50 border border-accent">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-gold" />
              <span className="font-medium">
                {sendOptimalTime ? 'Will send at optimal time on' : 'Scheduled for'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {format(new Date(`${scheduleDate}T${scheduleTime}`), 'EEEE, MMMM d, yyyy')}
              {!sendOptimalTime && ` at ${scheduleTime}`}
              {' '}({timezones.find(t => t.value === timezone)?.label || timezone})
              {recurringEnabled && (
                <Badge variant="secondary" className="ml-2">
                  {recurringOptions.find(r => r.value === recurringFrequency)?.label}
                </Badge>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
