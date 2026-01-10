import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  FlaskConical,
  Plus,
  Trash2,
  Trophy,
  TrendingUp,
  Users,
  MousePointer,
  Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Variant {
  id: string;
  name: string;
  subject: string;
  percentage: number;
  sentCount?: number;
  openCount?: number;
  clickCount?: number;
}

interface ABTestingPanelProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  variants: Variant[];
  onVariantsChange: (variants: Variant[]) => void;
  isEditable?: boolean;
}

export function ABTestingPanel({
  enabled,
  onEnabledChange,
  variants,
  onVariantsChange,
  isEditable = true,
}: ABTestingPanelProps) {
  const addVariant = () => {
    const nextLetter = String.fromCharCode(65 + variants.length); // A, B, C...
    const newPercentage = Math.floor(100 / (variants.length + 1));
    
    // Redistribute percentages
    const updatedVariants = variants.map(v => ({
      ...v,
      percentage: newPercentage,
    }));
    
    onVariantsChange([
      ...updatedVariants,
      {
        id: crypto.randomUUID(),
        name: `Variant ${nextLetter}`,
        subject: '',
        percentage: newPercentage,
      },
    ]);
  };

  const removeVariant = (id: string) => {
    if (variants.length <= 2) return;
    const remaining = variants.filter(v => v.id !== id);
    const perVariant = Math.floor(100 / remaining.length);
    const updatedVariants = remaining.map((v, i) => ({
      ...v,
      percentage: i === 0 ? 100 - (perVariant * (remaining.length - 1)) : perVariant,
    }));
    onVariantsChange(updatedVariants);
  };

  const updateVariant = (id: string, updates: Partial<Variant>) => {
    onVariantsChange(
      variants.map(v => (v.id === id ? { ...v, ...updates } : v))
    );
  };

  const calculateWinner = () => {
    if (!variants.some(v => v.sentCount && v.sentCount > 0)) return null;
    
    let winner = variants[0];
    let highestOpenRate = 0;
    
    variants.forEach(v => {
      if (v.sentCount && v.sentCount > 0) {
        const openRate = (v.openCount || 0) / v.sentCount;
        if (openRate > highestOpenRate) {
          highestOpenRate = openRate;
          winner = v;
        }
      }
    });
    
    return winner;
  };

  const winner = calculateWinner();

  return (
    <Card className={cn(enabled && 'border-gold/30')}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-lg',
              enabled ? 'bg-gold/10' : 'bg-muted'
            )}>
              <FlaskConical className={cn(
                'w-5 h-5',
                enabled ? 'text-gold' : 'text-muted-foreground'
              )} />
            </div>
            <div>
              <CardTitle className="text-base">A/B Testing</CardTitle>
              <CardDescription>Test different subject lines</CardDescription>
            </div>
          </div>
          {isEditable && (
            <Switch
              checked={enabled}
              onCheckedChange={onEnabledChange}
            />
          )}
        </div>
      </CardHeader>
      
      {enabled && (
        <CardContent className="space-y-4">
          {variants.map((variant, index) => {
            const openRate = variant.sentCount && variant.sentCount > 0
              ? ((variant.openCount || 0) / variant.sentCount * 100).toFixed(1)
              : null;
            const clickRate = variant.openCount && variant.openCount > 0
              ? ((variant.clickCount || 0) / variant.openCount * 100).toFixed(1)
              : null;
            const isWinner = winner?.id === variant.id && variant.sentCount && variant.sentCount > 0;

            return (
              <div
                key={variant.id}
                className={cn(
                  'p-4 rounded-lg border transition-all',
                  isWinner ? 'border-gold bg-gold/5' : 'border-border'
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={index === 0 ? 'default' : 'secondary'}>
                      {variant.name}
                    </Badge>
                    {isWinner && (
                      <Badge className="bg-gold text-gold-foreground">
                        <Trophy className="w-3 h-3 mr-1" />
                        Winner
                      </Badge>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {variant.percentage}% of audience
                    </span>
                  </div>
                  {isEditable && variants.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => removeVariant(variant.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {isEditable ? (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Subject Line</Label>
                      <Input
                        placeholder={`Subject for ${variant.name}...`}
                        value={variant.subject}
                        onChange={(e) => updateVariant(variant.id, { subject: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Audience Split</Label>
                      <Slider
                        value={[variant.percentage]}
                        onValueChange={([value]) => updateVariant(variant.id, { percentage: value })}
                        max={100}
                        step={5}
                        className="mt-2"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm mb-3">{variant.subject}</p>
                    {variant.sentCount !== undefined && (
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span>{variant.sentCount} sent</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span>{openRate}% opens</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MousePointer className="w-4 h-4 text-muted-foreground" />
                          <span>{clickRate}% clicks</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}

          {isEditable && variants.length < 4 && (
            <Button
              variant="outline"
              className="w-full"
              onClick={addVariant}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Variant
            </Button>
          )}

          {isEditable && (
            <p className="text-xs text-muted-foreground text-center">
              Each variant will be sent to a portion of your audience. 
              The winning variant (highest open rate) can be sent to the remaining recipients.
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
