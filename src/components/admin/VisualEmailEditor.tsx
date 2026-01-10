import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Type,
  Image,
  Square,
  Link,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  Code,
  Columns,
  MousePointer,
  Palette,
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  Quote,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface VisualEmailEditorProps {
  value: string;
  onChange: (value: string) => void;
}

interface Block {
  id: string;
  type: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  html: string;
}

const blocks: Block[] = [
  {
    id: 'heading',
    type: 'heading',
    icon: Heading1,
    label: 'Heading',
    html: '<h2 style="color: #1a1a2e; font-size: 24px; margin: 0 0 16px 0;">Your Heading Here</h2>',
  },
  {
    id: 'subheading',
    type: 'subheading',
    icon: Heading2,
    label: 'Subheading',
    html: '<h3 style="color: #444; font-size: 18px; margin: 0 0 12px 0;">Subheading Text</h3>',
  },
  {
    id: 'paragraph',
    type: 'paragraph',
    icon: Type,
    label: 'Text',
    html: '<p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Your paragraph text goes here. You can write anything you want.</p>',
  },
  {
    id: 'image',
    type: 'image',
    icon: Image,
    label: 'Image',
    html: '<img src="https://via.placeholder.com/600x300" alt="Image" style="max-width: 100%; height: auto; display: block; margin: 16px 0; border-radius: 8px;" />',
  },
  {
    id: 'button',
    type: 'button',
    icon: MousePointer,
    label: 'Button',
    html: '<p style="text-align: center; margin: 24px 0;"><a href="#" style="display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #F4CF47 100%); color: #1a1a2e; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600;">Call to Action</a></p>',
  },
  {
    id: 'divider',
    type: 'divider',
    icon: Minus,
    label: 'Divider',
    html: '<hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />',
  },
  {
    id: 'spacer',
    type: 'spacer',
    icon: Square,
    label: 'Spacer',
    html: '<div style="height: 32px;"></div>',
  },
  {
    id: 'quote',
    type: 'quote',
    icon: Quote,
    label: 'Quote',
    html: '<blockquote style="border-left: 4px solid #D4AF37; margin: 16px 0; padding: 12px 20px; background: #f9f9f9; color: #555; font-style: italic;">"Your quote text here"</blockquote>',
  },
  {
    id: 'list',
    type: 'list',
    icon: List,
    label: 'List',
    html: '<ul style="color: #333; font-size: 16px; line-height: 1.8; margin: 0 0 16px 0; padding-left: 20px;"><li>First item</li><li>Second item</li><li>Third item</li></ul>',
  },
  {
    id: 'columns',
    type: 'columns',
    icon: Columns,
    label: '2 Columns',
    html: '<table width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0;"><tr><td width="50%" valign="top" style="padding-right: 12px;"><p style="margin: 0;">Left column content</p></td><td width="50%" valign="top" style="padding-left: 12px;"><p style="margin: 0;">Right column content</p></td></tr></table>',
  },
  {
    id: 'social',
    type: 'social',
    icon: Link,
    label: 'Social Links',
    html: '<p style="text-align: center; margin: 24px 0;"><a href="#" style="display: inline-block; margin: 0 8px; color: #666;">Instagram</a><a href="#" style="display: inline-block; margin: 0 8px; color: #666;">Twitter</a><a href="#" style="display: inline-block; margin: 0 8px; color: #666;">LinkedIn</a></p>',
  },
];

export function VisualEmailEditor({ value, onChange }: VisualEmailEditorProps) {
  const [mode, setMode] = useState<'visual' | 'code'>('visual');
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);

  const insertBlock = (block: Block) => {
    // Find content section and insert before closing div
    const contentMatch = value.match(/<div class="content"[^>]*>([\s\S]*?)<\/div>\s*<div class="footer"/i);
    if (contentMatch) {
      const insertPoint = value.indexOf('</div>', value.indexOf('<div class="content"'));
      if (insertPoint > -1) {
        const newHtml = 
          value.slice(0, insertPoint) + 
          '\n      ' + block.html + 
          value.slice(insertPoint);
        onChange(newHtml);
      }
    } else {
      // Fallback: insert before </body>
      const bodyCloseIndex = value.toLowerCase().indexOf('</body>');
      if (bodyCloseIndex > -1) {
        const newHtml = 
          value.slice(0, bodyCloseIndex) + 
          '\n' + block.html + '\n' + 
          value.slice(bodyCloseIndex);
        onChange(newHtml);
      } else {
        onChange(value + '\n' + block.html);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Email Content</Label>
        <Tabs value={mode} onValueChange={(v) => setMode(v as 'visual' | 'code')}>
          <TabsList className="h-8">
            <TabsTrigger value="visual" className="text-xs px-3 h-7">
              <Palette className="w-3 h-3 mr-1" />
              Visual
            </TabsTrigger>
            <TabsTrigger value="code" className="text-xs px-3 h-7">
              <Code className="w-3 h-3 mr-1" />
              HTML
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {mode === 'visual' ? (
        <div className="grid grid-cols-12 gap-4">
          {/* Block Palette */}
          <div className="col-span-3">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Content Blocks</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <ScrollArea className="h-[400px]">
                  <div className="grid grid-cols-2 gap-2">
                    {blocks.map((block) => {
                      const Icon = block.icon;
                      return (
                        <button
                          key={block.id}
                          onClick={() => insertBlock(block)}
                          className="flex flex-col items-center gap-1 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-accent transition-all text-center"
                        >
                          <Icon className="w-5 h-5 text-muted-foreground" />
                          <span className="text-xs">{block.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Editor Area */}
          <div className="col-span-9">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-3">
                  Click blocks to add them. Variables: {'{{first_name}}'}, {'{{email}}'}, {'{{unsubscribe_url}}'}
                </p>
                <Textarea
                  className="font-mono text-sm min-h-[400px] resize-none"
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder="Your email HTML content..."
                />
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-3">
              Edit raw HTML. Variables: {'{{first_name}}'}, {'{{email}}'}, {'{{unsubscribe_url}}'}
            </p>
            <Textarea
              className="font-mono text-xs min-h-[500px] resize-none"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="<!DOCTYPE html>..."
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
