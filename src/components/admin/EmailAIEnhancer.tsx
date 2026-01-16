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
  Lightbulb, LayoutTemplate
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
      // Ask user what to do
      const lines = aiResult.split('\n').filter(l => l.trim());
      if (lines.length === 1 || lines.every(l => l.length < 100)) {
        // Likely subject lines
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
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <LayoutTemplate className="w-4 h-4 text-primary" />
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
