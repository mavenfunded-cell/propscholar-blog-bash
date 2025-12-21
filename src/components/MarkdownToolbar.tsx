import { 
  Bold, 
  Italic, 
  Code, 
  Quote, 
  List, 
  ListOrdered, 
  Link, 
  Image, 
  Minus, 
  Eye,
  Heading1,
  Heading2,
  Heading3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MarkdownToolbarProps {
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (value: string) => void;
  showPreview: boolean;
  onTogglePreview: () => void;
}

interface ToolbarButton {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  prefix: string;
  suffix: string;
  block?: boolean;
}

const toolbarButtons: ToolbarButton[][] = [
  [
    { icon: Heading1, label: "Heading 1", prefix: "# ", suffix: "", block: true },
    { icon: Heading2, label: "Heading 2", prefix: "## ", suffix: "", block: true },
    { icon: Heading3, label: "Heading 3", prefix: "### ", suffix: "", block: true },
  ],
  [
    { icon: Bold, label: "Bold", prefix: "**", suffix: "**" },
    { icon: Italic, label: "Italic", prefix: "*", suffix: "*" },
    { icon: Code, label: "Code", prefix: "`", suffix: "`" },
  ],
  [
    { icon: Quote, label: "Quote", prefix: "> ", suffix: "", block: true },
    { icon: List, label: "Bullet List", prefix: "- ", suffix: "", block: true },
    { icon: ListOrdered, label: "Numbered List", prefix: "1. ", suffix: "", block: true },
  ],
  [
    { icon: Link, label: "Link", prefix: "[", suffix: "](url)" },
    { icon: Image, label: "Image", prefix: "![alt](", suffix: ")" },
    { icon: Minus, label: "Divider", prefix: "\n---\n", suffix: "", block: true },
  ],
];

export function MarkdownToolbar({ 
  textareaRef, 
  value, 
  onChange, 
  showPreview, 
  onTogglePreview 
}: MarkdownToolbarProps) {
  const insertMarkdown = (prefix: string, suffix: string, block?: boolean) => {
    const textarea = textareaRef?.current;
    if (!textarea) {
      // If no textarea ref, just append at the end
      const newValue = block 
        ? value + (value && !value.endsWith('\n') ? '\n' : '') + prefix + suffix
        : value + prefix + suffix;
      onChange(newValue);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    let newValue: string;
    let newCursorPos: number;

    if (block && start > 0 && value[start - 1] !== '\n') {
      // For block elements, ensure we're on a new line
      const linePrefix = '\n' + prefix;
      newValue = value.substring(0, start) + linePrefix + selectedText + suffix + value.substring(end);
      newCursorPos = start + linePrefix.length + selectedText.length + suffix.length;
    } else {
      newValue = value.substring(0, start) + prefix + selectedText + suffix + value.substring(end);
      newCursorPos = start + prefix.length + selectedText.length + suffix.length;
    }

    onChange(newValue);

    // Restore focus and set cursor position
    setTimeout(() => {
      textarea.focus();
      if (selectedText) {
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      } else {
        // If no selection, put cursor between prefix and suffix
        const cursorPos = start + prefix.length;
        textarea.setSelectionRange(cursorPos, cursorPos);
      }
    }, 0);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-0.5 p-1.5 bg-muted/50 rounded-t-lg border border-b-0 border-border flex-wrap">
        {toolbarButtons.map((group, groupIndex) => (
          <div key={groupIndex} className="flex items-center">
            {group.map((button) => (
              <Tooltip key={button.label}>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => insertMarkdown(button.prefix, button.suffix, button.block)}
                    disabled={showPreview}
                  >
                    <button.icon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {button.label}
                </TooltipContent>
              </Tooltip>
            ))}
            {groupIndex < toolbarButtons.length - 1 && (
              <Separator orientation="vertical" className="h-5 mx-1" />
            )}
          </div>
        ))}
        
        <div className="flex-1" />
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={showPreview ? "secondary" : "ghost"}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onTogglePreview}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {showPreview ? "Edit" : "Preview"}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
