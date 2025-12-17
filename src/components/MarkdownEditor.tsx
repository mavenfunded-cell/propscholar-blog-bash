import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import ReactMarkdown from 'react-markdown';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Heading1,
  Heading2,
  Heading3,
  Bold,
  Italic,
  Code,
  Quote,
  List,
  ListOrdered,
  Link2,
  Image,
  Minus,
  Eye,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onPaste?: (e: React.ClipboardEvent) => void;
  placeholder?: string;
  minHeight?: string;
  rows?: number;
  disabled?: boolean;
}

interface ToolbarButton {
  icon: React.ReactNode;
  label: string;
  prefix: string;
  suffix?: string;
  block?: boolean;
}

export function MarkdownEditor({
  value,
  onChange,
  onPaste,
  placeholder = "Write your article content in Markdown...",
  minHeight = "350px",
  rows = 14,
  disabled = false,
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(false);

  const toolbarButtons: ToolbarButton[] = [
    { icon: <Heading1 className="w-4 h-4" />, label: 'Heading 1', prefix: '# ', block: true },
    { icon: <Heading2 className="w-4 h-4" />, label: 'Heading 2', prefix: '## ', block: true },
    { icon: <Heading3 className="w-4 h-4" />, label: 'Heading 3', prefix: '### ', block: true },
  ];

  const formatButtons: ToolbarButton[] = [
    { icon: <Bold className="w-4 h-4" />, label: 'Bold', prefix: '**', suffix: '**' },
    { icon: <Italic className="w-4 h-4" />, label: 'Italic', prefix: '*', suffix: '*' },
    { icon: <Code className="w-4 h-4" />, label: 'Code', prefix: '`', suffix: '`' },
  ];

  const blockButtons: ToolbarButton[] = [
    { icon: <Quote className="w-4 h-4" />, label: 'Blockquote', prefix: '> ', block: true },
    { icon: <List className="w-4 h-4" />, label: 'Bullet List', prefix: '- ', block: true },
    { icon: <ListOrdered className="w-4 h-4" />, label: 'Numbered List', prefix: '1. ', block: true },
  ];

  const insertButtons: ToolbarButton[] = [
    { icon: <Link2 className="w-4 h-4" />, label: 'Link', prefix: '[', suffix: '](url)' },
    { icon: <Image className="w-4 h-4" />, label: 'Image', prefix: '![alt](', suffix: ')' },
    { icon: <Minus className="w-4 h-4" />, label: 'Horizontal Rule', prefix: '\n---\n', block: true },
  ];

  const insertMarkdown = (button: ToolbarButton) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    let newText: string;
    let newCursorPos: number;

    if (button.block) {
      // For block elements, add at the start of the line
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const beforeLine = value.substring(0, lineStart);
      const afterCursor = value.substring(start);
      
      if (selectedText) {
        newText = beforeLine + button.prefix + selectedText + (button.suffix || '') + value.substring(end);
        newCursorPos = lineStart + button.prefix.length + selectedText.length + (button.suffix?.length || 0);
      } else {
        newText = beforeLine + button.prefix + afterCursor;
        newCursorPos = lineStart + button.prefix.length;
      }
    } else {
      // For inline elements, wrap the selected text
      const before = value.substring(0, start);
      const after = value.substring(end);
      
      if (selectedText) {
        newText = before + button.prefix + selectedText + (button.suffix || '') + after;
        newCursorPos = start + button.prefix.length + selectedText.length + (button.suffix?.length || 0);
      } else {
        newText = before + button.prefix + (button.suffix || '') + after;
        newCursorPos = start + button.prefix.length;
      }
    }

    onChange(newText);

    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const renderToolbarButton = (button: ToolbarButton, index: number) => (
    <TooltipProvider key={index}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-secondary"
            onClick={() => insertMarkdown(button)}
            disabled={disabled || showPreview}
          >
            {button.icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{button.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div className="rounded-md border border-border bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-border bg-secondary/30 flex-wrap">
        {/* Headings */}
        <div className="flex items-center">
          {toolbarButtons.map((btn, i) => renderToolbarButton(btn, i))}
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Formatting */}
        <div className="flex items-center">
          {formatButtons.map((btn, i) => renderToolbarButton(btn, i + 10))}
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Block elements */}
        <div className="flex items-center">
          {blockButtons.map((btn, i) => renderToolbarButton(btn, i + 20))}
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Insert elements */}
        <div className="flex items-center">
          {insertButtons.map((btn, i) => renderToolbarButton(btn, i + 30))}
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Preview Toggle */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                pressed={showPreview}
                onPressedChange={setShowPreview}
                size="sm"
                className="h-8 w-8 p-0 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                disabled={disabled}
              >
                <Eye className="w-4 h-4" />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent>
              <p>{showPreview ? 'Edit' : 'Preview'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Editor / Preview */}
      {showPreview ? (
        <ScrollArea className={`p-4`} style={{ minHeight }}>
          <div className="prose prose-sm prose-invert max-w-none">
            {value ? (
              <ReactMarkdown
                components={{
                  h1: ({children}) => <h1 className="text-2xl font-bold mt-4 mb-2 text-foreground">{children}</h1>,
                  h2: ({children}) => <h2 className="text-xl font-semibold mt-3 mb-2 text-foreground">{children}</h2>,
                  h3: ({children}) => <h3 className="text-lg font-semibold mt-3 mb-1 text-foreground">{children}</h3>,
                  p: ({children}) => <p className="mb-3 text-foreground/90 leading-relaxed">{children}</p>,
                  ul: ({children}) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
                  ol: ({children}) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
                  li: ({children}) => <li className="text-foreground/90">{children}</li>,
                  blockquote: ({children}) => <blockquote className="border-l-4 border-primary/50 pl-4 italic text-muted-foreground my-3">{children}</blockquote>,
                  strong: ({children}) => <strong className="font-bold text-foreground">{children}</strong>,
                  em: ({children}) => <em className="italic">{children}</em>,
                  code: ({children}) => <code className="bg-secondary px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>,
                  a: ({href, children}) => <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                  hr: () => <hr className="my-4 border-border" />,
                }}
              >
                {value}
              </ReactMarkdown>
            ) : (
              <p className="text-muted-foreground italic">Nothing to preview</p>
            )}
          </div>
        </ScrollArea>
      ) : (
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={onPaste}
          placeholder={placeholder}
          rows={rows}
          className="no-select resize-y border-0 rounded-none rounded-b-md focus-visible:ring-0 focus-visible:ring-offset-0 font-mono text-sm"
          style={{ minHeight }}
          disabled={disabled}
        />
      )}
    </div>
  );
}