import { Eye } from "lucide-react";
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
  label: string;
  displayLabel: string;
  prefix: string;
  suffix: string;
  block?: boolean;
}

const toolbarButtons: ToolbarButton[][] = [
  [
    { label: "Heading 1", displayLabel: "H₁", prefix: "# ", suffix: "", block: true },
    { label: "Heading 2", displayLabel: "H₂", prefix: "## ", suffix: "", block: true },
    { label: "Heading 3", displayLabel: "H₃", prefix: "### ", suffix: "", block: true },
  ],
  [
    { label: "Bold", displayLabel: "B", prefix: "**", suffix: "**" },
    { label: "Italic", displayLabel: "𝐼", prefix: "*", suffix: "*" },
    { label: "Code", displayLabel: "<>", prefix: "`", suffix: "`" },
  ],
  [
    { label: "Quote", displayLabel: "❝", prefix: "> ", suffix: "", block: true },
    { label: "Bullet List", displayLabel: "☰", prefix: "- ", suffix: "", block: true },
    { label: "Numbered List", displayLabel: "≡", prefix: "1. ", suffix: "", block: true },
  ],
  [
    { label: "Link", displayLabel: "🔗", prefix: "[", suffix: "](url)" },
    { label: "Image", displayLabel: "🖼", prefix: "![alt](", suffix: ")" },
    { label: "Divider", displayLabel: "—", prefix: "\n---\n", suffix: "", block: true },
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
      const linePrefix = '\n' + prefix;
      newValue = value.substring(0, start) + linePrefix + selectedText + suffix + value.substring(end);
      newCursorPos = start + linePrefix.length + selectedText.length + suffix.length;
    } else {
      newValue = value.substring(0, start) + prefix + selectedText + suffix + value.substring(end);
      newCursorPos = start + prefix.length + selectedText.length + suffix.length;
    }

    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      if (selectedText) {
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      } else {
        const cursorPos = start + prefix.length;
        textarea.setSelectionRange(cursorPos, cursorPos);
      }
    }, 0);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1 px-3 py-2 bg-muted/80 rounded-t-lg border border-b-0 border-border">
        {toolbarButtons.map((group, groupIndex) => (
          <div key={groupIndex} className="flex items-center gap-0.5">
            {group.map((button) => (
              <Tooltip key={button.label}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={`px-2 py-1 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-background/50 rounded transition-colors ${
                      button.displayLabel === "B" ? "font-bold" : ""
                    } ${button.displayLabel === "𝐼" ? "italic" : ""}`}
                    onClick={() => insertMarkdown(button.prefix, button.suffix, button.block)}
                    disabled={showPreview}
                  >
                    {button.displayLabel}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {button.label}
                </TooltipContent>
              </Tooltip>
            ))}
            {groupIndex < toolbarButtons.length - 1 && (
              <Separator orientation="vertical" className="h-5 mx-2" />
            )}
          </div>
        ))}
        
        <div className="flex-1" />
        
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={`px-2 py-1 text-sm rounded transition-colors ${
                showPreview 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              }`}
              onClick={onTogglePreview}
            >
              👁
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {showPreview ? "Edit" : "Preview"}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
