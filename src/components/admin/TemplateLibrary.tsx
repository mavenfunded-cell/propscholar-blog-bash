import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LayoutTemplate,
  Plus,
  Copy,
  Trash2,
  Edit,
  Eye,
  Check,
  Star,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface Template {
  id: string;
  name: string;
  category: string;
  subject: string | null;
  html_content: string;
  plain_text_content: string | null;
  is_default: boolean;
  created_at: string;
}

interface TemplateLibraryProps {
  onSelect: (template: Template) => void;
  currentHtml?: string;
}

export function TemplateLibrary({ onSelect, currentHtml }: TemplateLibraryProps) {
  const [open, setOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState('Custom');
  const [activeCategory, setActiveCategory] = useState('all');
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_email_templates');
      if (error) throw error;
      return data as Template[];
    },
    enabled: open,
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('email_templates')
        .insert({
          name: newTemplateName,
          category: newTemplateCategory,
          html_content: currentHtml || '',
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template saved!');
      setSaveDialogOpen(false);
      setNewTemplateName('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save template');
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete');
    },
  });

  const categories = ['all', ...new Set(templates?.map(t => t.category) || [])];
  const filteredTemplates = activeCategory === 'all' 
    ? templates 
    : templates?.filter(t => t.category === activeCategory);

  const handleUseTemplate = (template: Template) => {
    onSelect(template);
    setOpen(false);
    toast.success(`Applied template: ${template.name}`);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <LayoutTemplate className="w-4 h-4 mr-2" />
            Templates
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <LayoutTemplate className="w-5 h-5" />
                Email Templates
              </DialogTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSaveDialogOpen(true)}
                disabled={!currentHtml}
              >
                <Plus className="w-4 h-4 mr-2" />
                Save Current as Template
              </Button>
            </div>
          </DialogHeader>

          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="mb-4">
              {categories.map(cat => (
                <TabsTrigger key={cat} value={cat} className="capitalize">
                  {cat === 'all' ? 'All Templates' : cat}
                </TabsTrigger>
              ))}
            </TabsList>

            <ScrollArea className="h-[500px] pr-4">
              {isLoading ? (
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} className="h-48" />
                  ))}
                </div>
              ) : filteredTemplates?.length === 0 ? (
                <div className="text-center py-12">
                  <LayoutTemplate className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No templates found</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {filteredTemplates?.map(template => (
                    <Card
                      key={template.id}
                      className="overflow-hidden hover:border-primary/50 transition-colors group"
                    >
                      <div className="h-32 bg-muted relative overflow-hidden">
                        <iframe
                          srcDoc={template.html_content}
                          className="w-full h-full scale-50 origin-top-left pointer-events-none"
                          style={{ width: '200%', height: '200%' }}
                          title={template.name}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                        {template.is_default && (
                          <Badge className="absolute top-2 right-2 bg-gold text-gold-foreground">
                            <Star className="w-3 h-3 mr-1" />
                            Default
                          </Badge>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium line-clamp-1">{template.name}</h4>
                            <Badge variant="secondary" className="text-xs mt-1">
                              {template.category}
                            </Badge>
                          </div>
                        </div>
                        {template.subject && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mb-3">
                            Subject: {template.subject}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => handleUseTemplate(template)}
                          >
                            <Check className="w-3 h-3 mr-1" />
                            Use
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPreviewTemplate(template)}
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          {!template.is_default && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => deleteTemplateMutation.mutate(template.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Save Template Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Template Name</Label>
              <Input
                placeholder="My Newsletter Template"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Input
                placeholder="Marketing"
                value={newTemplateCategory}
                onChange={(e) => setNewTemplateCategory(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveTemplateMutation.mutate()}
              disabled={!newTemplateName || saveTemplateMutation.isPending}
            >
              {saveTemplateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[500px]">
            <iframe
              srcDoc={previewTemplate?.html_content}
              className="w-full min-h-[500px] bg-white rounded-lg"
              title="Template Preview"
            />
          </ScrollArea>
          <DialogFooter>
            <Button
              onClick={() => {
                if (previewTemplate) handleUseTemplate(previewTemplate);
                setPreviewTemplate(null);
              }}
            >
              <Check className="w-4 h-4 mr-2" />
              Use This Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
