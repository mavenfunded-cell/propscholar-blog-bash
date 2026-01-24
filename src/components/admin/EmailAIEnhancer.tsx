import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import {
  Sparkles, Wand2, ImagePlus, PenLine, RefreshCw, Copy, Check,
  Target, Smile, Zap, MessageSquare, Loader2, ChevronRight,
  Lightbulb, Code, Palette, Type, Smartphone, Trash2, Undo2,
  Eye, CheckCircle, XCircle, LayoutTemplate
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface EmailAIEnhancerProps {
  htmlContent: string;
  subject: string;
  onUpdateContent: (html: string) => void;
  onUpdateSubject: (subject: string) => void;
}

const TONE_OPTIONS = [
  { id: 'professional', label: 'Professional', icon: Target },
  { id: 'friendly', label: 'Friendly', icon: Smile },
  { id: 'urgent', label: 'Urgent', icon: Zap },
  { id: 'casual', label: 'Casual', icon: MessageSquare },
];

const QUICK_ACTIONS = [
  { id: 'improve', label: 'Improve Copy', prompt: 'Improve this email copy to be more engaging and persuasive' },
  { id: 'shorten', label: 'Make Shorter', prompt: 'Make this email more concise while keeping the key message' },
  { id: 'cta', label: 'Stronger CTA', prompt: 'Improve the call-to-action to be more compelling' },
  { id: 'subject', label: 'Better Subject', prompt: 'Generate 3 better subject line options' },
  { id: 'personalize', label: 'Add Personalization', prompt: 'Add more personalization elements using {{first_name}} and other variables' },
];

const CODE_QUICK_ACTIONS = [
  { id: 'change_colors', label: 'Change Colors', icon: Palette, prompt: 'Change the color scheme' },
  { id: 'edit_header', label: 'Edit Header', icon: Type, prompt: 'Modify the header section' },
  { id: 'update_button', label: 'Update Button', icon: CheckCircle, prompt: 'Change the button style or text' },
  { id: 'mobile_friendly', label: 'Make Mobile-Friendly', icon: Smartphone, prompt: 'Add responsive CSS for mobile devices' },
  { id: 'clean_html', label: 'Clean Up HTML', icon: Trash2, prompt: 'Remove unnecessary tags and whitespace, optimize the code' },
];

export function EmailAIEnhancer({ htmlContent, subject, onUpdateContent, onUpdateSubject }: EmailAIEnhancerProps) {
  const [activeTab, setActiveTab] = useState('enhance');
  const [isGenerating, setIsGenerating] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedTone, setSelectedTone] = useState('professional');
  const [aiResult, setAiResult] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Image generation
  const [imagePrompt, setImagePrompt] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // Code editing states
  const [codeInstruction, setCodeInstruction] = useState('');
  const [pendingHtml, setPendingHtml] = useState<string | null>(null);
  const [lastHtml, setLastHtml] = useState<string | null>(null);
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [codeActionType, setCodeActionType] = useState<string>('');

  const extractTextFromHtml = (html: string): string => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  };

  const generateAIContent = async (action: string, customInstruction?: string) => {
    setIsGenerating(true);
    setAiResult('');
    
    try {
      const emailText = extractTextFromHtml(htmlContent);
      const prompt = customInstruction || action;
      
      const systemPrompt = `You are an expert email marketing copywriter. You specialize in creating high-converting, engaging email campaigns for PropScholar, a prop trading education platform.

Your emails should:
- Be clear, concise, and action-oriented
- Use persuasive language without being pushy
- Include compelling subject lines and preheaders
- Support personalization variables like {{first_name}}, {{email}}, {{unsubscribe_url}}
- Follow email marketing best practices
- Be optimized for mobile reading
- Have a clear call-to-action

Current tone: ${selectedTone}
Current subject: ${subject}
Current email content: ${emailText}`;

      const response = await supabase.functions.invoke('ai-email-enhance', {
        body: {
          prompt,
          systemPrompt,
          emailContent: emailText,
          subject,
          action,
        },
      });

      if (response.error) throw response.error;
      
      const result = response.data?.result || response.data?.content || '';
      setAiResult(result);
      toast.success('AI suggestion generated!');
    } catch (error: any) {
      console.error('AI generation error:', error);
      toast.error(error.message || 'Failed to generate AI content');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateCodeEdit = async (instruction: string, quickActionId?: string) => {
    if (!instruction.trim()) {
      toast.error('Please describe what you want to change');
      return;
    }

    setIsEditingCode(true);
    setPendingHtml(null);
    setCodeActionType(quickActionId || 'custom');
    
    try {
      const response = await supabase.functions.invoke('ai-email-enhance', {
        body: {
          prompt: instruction,
          emailContent: htmlContent,
          subject,
          action: 'edit_code',
          fullHtml: true,
        },
      });

      if (response.error) throw response.error;
      
      const result = response.data?.result || '';
      
      // Extract HTML from the result (AI might wrap it in markdown code blocks)
      let cleanHtml = result;
      const htmlMatch = result.match(/```html?\s*([\s\S]*?)```/);
      if (htmlMatch) {
        cleanHtml = htmlMatch[1].trim();
      }
      
      // Validate it looks like HTML
      if (cleanHtml.includes('<') && cleanHtml.includes('>')) {
        setPendingHtml(cleanHtml);
        toast.success('Code changes ready for review!');
      } else {
        toast.error('AI did not return valid HTML. Please try a different instruction.');
      }
    } catch (error: any) {
      console.error('Code edit error:', error);
      if (error.message?.includes('Rate limit')) {
        toast.error('Rate limit exceeded. Please wait a moment.');
      } else if (error.message?.includes('credits')) {
        toast.error('AI credits exhausted. Please add more credits.');
      } else {
        toast.error(error.message || 'Failed to generate code changes');
      }
    } finally {
      setIsEditingCode(false);
    }
  };

  const applyCodeChanges = () => {
    if (!pendingHtml) return;
    
    // Save current HTML for undo
    setLastHtml(htmlContent);
    
    // Apply the new HTML
    onUpdateContent(pendingHtml);
    setPendingHtml(null);
    setCodeInstruction('');
    toast.success('Code changes applied!');
  };

  const discardCodeChanges = () => {
    setPendingHtml(null);
    toast.info('Changes discarded');
  };

  const undoLastChange = () => {
    if (!lastHtml) {
      toast.info('Nothing to undo');
      return;
    }
    
    onUpdateContent(lastHtml);
    setLastHtml(null);
    toast.success('Reverted to previous version');
  };

  const generateImage = async () => {
    if (!imagePrompt.trim()) {
      toast.error('Please enter an image description');
      return;
    }
    
    setIsGeneratingImage(true);
    
    try {
      const response = await supabase.functions.invoke('ai-generate-email-image', {
        body: {
          prompt: `Email marketing image for PropScholar (prop trading education): ${imagePrompt}. Professional, clean, modern design suitable for email marketing.`,
        },
      });

      if (response.error) throw response.error;
      
      const imageUrl = response.data?.imageUrl || response.data?.url;
      if (imageUrl) {
        setGeneratedImageUrl(imageUrl);
        toast.success('Image generated!');
      } else {
        throw new Error('No image URL returned');
      }
    } catch (error: any) {
      console.error('Image generation error:', error);
      toast.error(error.message || 'Failed to generate image');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const applyToEmail = () => {
    if (!aiResult) return;
    
    // Try to detect if result is a subject line suggestion
    if (aiResult.toLowerCase().includes('subject') || aiResult.split('\n').length <= 3) {
      const lines = aiResult.split('\n').filter(l => l.trim());
      if (lines.length === 1 || lines.every(l => l.length < 100)) {
        onUpdateSubject(lines[0].replace(/^\d+[\.\)]\s*/, '').replace(/^[\"']|[\"']$/g, ''));
        toast.success('Subject line updated!');
        return;
      }
    }
    
    // Otherwise update the content
    const newContent = htmlContent.replace(
      /(<div class="content">)([\s\S]*?)(<\/div>\s*<div class="footer">)/,
      `$1
      <p>Hi {{first_name}},</p>
      ${aiResult.split('\n').map(p => `<p>${p}</p>`).join('\n      ')}
    $3`
    );
    onUpdateContent(newContent);
    toast.success('Email content updated!');
  };

  const insertImageToEmail = () => {
    if (!generatedImageUrl) return;
    
    const imgHtml = `<img src="${generatedImageUrl}" alt="Email image" style="max-width: 100%; height: auto; display: block; margin: 20px auto;" />`;
    
    const newContent = htmlContent.replace(
      /(<div class="content">[\s\S]*?<p>Hi \{\{first_name\}\},<\/p>)/,
      `$1
      ${imgHtml}`
    );
    onUpdateContent(newContent);
    toast.success('Image inserted into email!');
  };

  return (
    <div className="h-full flex flex-col bg-card/50 border-l border-border/50">
      <div className="p-4 border-b border-border/50 bg-gradient-to-r from-primary/10 to-purple-500/10">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/20">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">AI Email Assistant</h3>
            <p className="text-xs text-muted-foreground">Enhance your campaigns with AI</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b border-border/50 bg-transparent px-4 pt-2">
          <TabsTrigger value="enhance" className="rounded-t-lg data-[state=active]:bg-background">
            <Wand2 className="w-4 h-4 mr-1.5" />
            Enhance
          </TabsTrigger>
          <TabsTrigger value="code" className="rounded-t-lg data-[state=active]:bg-background">
            <Code className="w-4 h-4 mr-1.5" />
            Code
          </TabsTrigger>
          <TabsTrigger value="image" className="rounded-t-lg data-[state=active]:bg-background">
            <ImagePlus className="w-4 h-4 mr-1.5" />
            Images
          </TabsTrigger>
          <TabsTrigger value="ideas" className="rounded-t-lg data-[state=active]:bg-background">
            <Lightbulb className="w-4 h-4 mr-1.5" />
            Ideas
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="enhance" className="m-0 p-4 space-y-4">
            {/* Tone Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Email Tone
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {TONE_OPTIONS.map((tone) => (
                  <button
                    key={tone.id}
                    onClick={() => setSelectedTone(tone.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all text-sm ${
                      selectedTone === tone.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/50 hover:border-primary/50 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <tone.icon className="w-4 h-4" />
                    {tone.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Quick Actions
              </Label>
              <div className="space-y-2">
                {QUICK_ACTIONS.map((action) => (
                  <Button
                    key={action.id}
                    variant="outline"
                    size="sm"
                    className="w-full justify-between text-left h-auto py-2.5 px-3 border-border/50"
                    onClick={() => generateAIContent(action.id, action.prompt)}
                    disabled={isGenerating}
                  >
                    <span>{action.label}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Prompt */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Custom Request
              </Label>
              <Textarea
                placeholder="E.g., 'Add urgency to encourage sign-ups before the deadline'"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="min-h-[80px] resize-none border-border/50"
              />
              <Button
                onClick={() => generateAIContent('custom', customPrompt)}
                disabled={isGenerating || !customPrompt.trim()}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate with AI
                  </>
                )}
              </Button>
            </div>

            {/* AI Result */}
            {aiResult && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="bg-primary/20 text-primary">
                      <Sparkles className="w-3 h-3 mr-1" />
                      AI Suggestion
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => copyToClipboard(aiResult, 'result')}
                      >
                        {copiedId === 'result' ? (
                          <Check className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => generateAIContent('improve')}
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{aiResult}</p>
                  <Button
                    size="sm"
                    onClick={applyToEmail}
                    className="w-full"
                  >
                    <PenLine className="w-4 h-4 mr-2" />
                    Apply to Email
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* New Code Tab */}
          <TabsContent value="code" className="m-0 p-4 space-y-4">
            {/* Undo Button */}
            {lastHtml && (
              <Button
                variant="outline"
                size="sm"
                onClick={undoLastChange}
                className="w-full border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
              >
                <Undo2 className="w-4 h-4 mr-2" />
                Undo Last Change
              </Button>
            )}

            {/* Quick Code Actions */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Quick Code Edits
              </Label>
              <div className="space-y-2">
                {CODE_QUICK_ACTIONS.map((action) => (
                  <Button
                    key={action.id}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-left h-auto py-2.5 px-3 border-border/50"
                    onClick={() => {
                      setCodeInstruction(action.prompt);
                      generateCodeEdit(action.prompt, action.id);
                    }}
                    disabled={isEditingCode}
                  >
                    <action.icon className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span>{action.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Code Instruction */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Describe Your Edit
              </Label>
              <Textarea
                placeholder="E.g., 'Add a second CTA button below the main content with text Start Trading Now' or 'Change the header background to a gold gradient'"
                value={codeInstruction}
                onChange={(e) => setCodeInstruction(e.target.value)}
                className="min-h-[100px] resize-none border-border/50"
              />
              <Button
                onClick={() => generateCodeEdit(codeInstruction)}
                disabled={isEditingCode || !codeInstruction.trim()}
                className="w-full"
              >
                {isEditingCode ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Code...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Apply Edit to Code
                  </>
                )}
              </Button>
            </div>

            {/* Pending Changes Preview */}
            {pendingHtml && (
              <Card className="border-green-500/30 bg-green-500/5">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-green-500/20 text-green-600">
                      <Code className="w-3 h-3 mr-1" />
                      Pending Changes
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    AI has generated new HTML code based on your instruction. Review the changes in the preview before applying.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={applyCodeChanges}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Apply
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={discardCodeChanges}
                      className="flex-1 border-red-500/50 text-red-600 hover:bg-red-500/10"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Discard
                    </Button>
                  </div>
                  <div className="mt-2 p-2 bg-muted/30 rounded border border-border/50 max-h-[200px] overflow-auto">
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all">
                      {pendingHtml.substring(0, 500)}
                      {pendingHtml.length > 500 && '...'}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Template Mode */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Template Actions
              </Label>
              <div className="space-y-2">
                {[
                  { label: 'Convert to Welcome Email', prompt: 'Convert this email into a professional welcome email template with a warm greeting, introduction to PropScholar, and clear next steps' },
                  { label: 'Convert to Newsletter', prompt: 'Restructure this email as a newsletter with sections for featured content, tips, and a footer with social links' },
                  { label: 'Convert to Promo Email', prompt: 'Transform this into a promotional email with urgency elements, clear offer highlight, and multiple CTAs' },
                  { label: 'Generate Fresh Email', prompt: 'Generate a completely new professional email template based on the current subject line and key message, with modern styling' },
                ].map((template, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-left h-auto py-2 px-3 text-xs border-border/50"
                    onClick={() => {
                      setCodeInstruction(template.prompt);
                      generateCodeEdit(template.prompt, 'template');
                    }}
                    disabled={isEditingCode}
                  >
                    <LayoutTemplate className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                    {template.label}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="image" className="m-0 p-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Describe Your Image
              </Label>
              <Textarea
                placeholder="E.g., 'A professional trader looking at multiple screens with charts, blue and purple gradient background'"
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                className="min-h-[100px] resize-none border-border/50"
              />
              <Button
                onClick={generateImage}
                disabled={isGeneratingImage || !imagePrompt.trim()}
                className="w-full"
              >
                {isGeneratingImage ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Image...
                  </>
                ) : (
                  <>
                    <ImagePlus className="w-4 h-4 mr-2" />
                    Generate Image
                  </>
                )}
              </Button>
            </div>

            {generatedImageUrl && (
              <Card className="border-primary/30 overflow-hidden">
                <img
                  src={generatedImageUrl}
                  alt="Generated email image"
                  className="w-full h-auto"
                />
                <CardContent className="p-3">
                  <Button
                    size="sm"
                    onClick={insertImageToEmail}
                    className="w-full"
                  >
                    <PenLine className="w-4 h-4 mr-2" />
                    Insert into Email
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Image Suggestions */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Quick Prompts
              </Label>
              <div className="space-y-2">
                {[
                  'Professional trading dashboard with charts',
                  'Success celebration with confetti and trophy',
                  'Modern office workspace with laptop',
                  'Abstract financial growth illustration',
                ].map((suggestion, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-left h-auto py-2 px-3 text-xs border-border/50"
                    onClick={() => setImagePrompt(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ideas" className="m-0 p-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Campaign Ideas
              </Label>
              <p className="text-sm text-muted-foreground">
                Click any idea to generate content based on it.
              </p>
            </div>

            <div className="space-y-2">
              {[
                { title: 'Welcome Series', desc: 'Onboard new subscribers with a warm welcome' },
                { title: 'Course Promotion', desc: 'Highlight a trading course or lesson' },
                { title: 'Success Stories', desc: 'Share trader testimonials and wins' },
                { title: 'Limited Offer', desc: 'Create urgency with a time-sensitive deal' },
                { title: 'Educational Tips', desc: 'Share valuable trading insights' },
                { title: 'Re-engagement', desc: 'Win back inactive subscribers' },
              ].map((idea, i) => (
                <Card
                  key={i}
                  className="cursor-pointer hover:border-primary/50 transition-colors border-border/50"
                  onClick={() => {
                    setCustomPrompt(`Create an email for: ${idea.title} - ${idea.desc}`);
                    setActiveTab('enhance');
                  }}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded bg-primary/10">
                        <Lightbulb className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{idea.title}</p>
                        <p className="text-xs text-muted-foreground">{idea.desc}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
