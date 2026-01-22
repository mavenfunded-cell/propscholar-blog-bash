import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Loader2, MessageSquare, FileText, Heart, Check, Wand2 } from "lucide-react";

interface EnhancedOption {
  type: "short" | "detailed" | "sympathy";
  label: string;
  icon: React.ReactNode;
  content: string;
}

interface ReplyAIEnhancerProps {
  originalText: string;
  onSelectOption: (content: string) => void;
}

export const useReplyAIEnhancer = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [options, setOptions] = useState<EnhancedOption[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const handleEnhance = async (text: string) => {
    if (!text.trim()) {
      toast.error("Please write something first to enhance");
      return;
    }

    setIsLoading(true);
    setOptions([]);
    setSelectedType(null);

    try {
      const { data, error } = await supabase.functions.invoke("enhance-ticket-reply", {
        body: { text },
      });

      if (error) throw error;

      if (data?.options) {
        setOptions([
          {
            type: "short",
            label: "Short",
            icon: <MessageSquare className="h-4 w-4" />,
            content: data.options.short,
          },
          {
            type: "detailed",
            label: "Detailed",
            icon: <FileText className="h-4 w-4" />,
            content: data.options.detailed,
          },
          {
            type: "sympathy",
            label: "Sympathy",
            icon: <Heart className="h-4 w-4" />,
            content: data.options.sympathy,
          },
        ]);
      }
    } catch (err: any) {
      console.error("AI enhance error:", err);
      if (err.message?.includes("429")) {
        toast.error("Rate limit exceeded. Please try again in a moment.");
      } else if (err.message?.includes("402")) {
        toast.error("AI credits exhausted. Please add more credits.");
      } else {
        toast.error("Failed to enhance reply");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const clearOptions = () => {
    setOptions([]);
    setSelectedType(null);
  };

  return { isLoading, options, selectedType, setSelectedType, handleEnhance, clearOptions };
};

// Button component for the header
interface FixWithAIButtonProps {
  onClick: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

export const FixWithAIButton = ({ onClick, isLoading, disabled }: FixWithAIButtonProps) => {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={isLoading || disabled}
      className="gap-1.5 border-primary/50 hover:border-primary hover:bg-primary/10 ml-auto"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="hidden sm:inline">Fixing...</span>
        </>
      ) : (
        <>
          <Wand2 className="h-4 w-4" />
          <span className="hidden sm:inline">Fix with AI</span>
          <span className="sm:hidden">AI</span>
        </>
      )}
    </Button>
  );
};

// Options panel component
interface AIOptionsPanelProps {
  options: EnhancedOption[];
  selectedType: string | null;
  onSelectOption: (option: EnhancedOption) => void;
}

export const AIOptionsPanel = ({ options, selectedType, onSelectOption }: AIOptionsPanelProps) => {
  if (options.length === 0) return null;

  return (
    <div className="bg-muted/50 rounded-lg border border-border p-3 space-y-3 mb-3">
      <p className="text-xs text-muted-foreground font-medium">
        Choose a version to use:
      </p>
      <div className="grid gap-2">
        {options.map((option) => (
          <div
            key={option.type}
            className={`p-3 rounded-lg border cursor-pointer transition-all hover:border-primary/50 ${
              selectedType === option.type
                ? "border-primary bg-primary/10"
                : "border-border bg-background"
            }`}
            onClick={() => onSelectOption(option)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-md ${
                  option.type === "short" ? "bg-blue-500/20 text-blue-400" :
                  option.type === "detailed" ? "bg-purple-500/20 text-purple-400" :
                  "bg-pink-500/20 text-pink-400"
                }`}>
                  {option.icon}
                </div>
                <span className="font-medium text-sm">{option.label}</span>
              </div>
              {selectedType === option.type && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
              {option.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

// Keep original component for backwards compatibility
export const ReplyAIEnhancer = ({ originalText, onSelectOption }: ReplyAIEnhancerProps) => {
  const { isLoading, options, selectedType, setSelectedType, handleEnhance } = useReplyAIEnhancer();

  const handleSelectOption = (option: EnhancedOption) => {
    setSelectedType(option.type);
    onSelectOption(option.content);
    toast.success(`${option.label} version applied`);
  };

  return (
    <div className="space-y-3">
      <FixWithAIButton
        onClick={() => handleEnhance(originalText)}
        isLoading={isLoading}
        disabled={!originalText.trim()}
      />
      <AIOptionsPanel
        options={options}
        selectedType={selectedType}
        onSelectOption={handleSelectOption}
      />
    </div>
  );
};
