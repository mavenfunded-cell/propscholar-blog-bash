import { useState } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SupportChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    email: "",
    phone: "",
    problem: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.email || !form.problem) {
      toast.error("Please fill in required fields");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.functions.invoke("create-chatbot-ticket", {
        body: {
          email: form.email,
          phone: form.phone || null,
          problem: form.problem,
          session_id: crypto.randomUUID(),
        },
      });

      if (error) throw error;

      setSubmitted(true);
      setForm({ email: "", phone: "", problem: "" });
    } catch (err: any) {
      console.error("Failed to submit ticket:", err);
      toast.error("Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => setSubmitted(false), 300);
  };

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-5 right-5 z-50 w-12 h-12 rounded-full bg-[#1e40af] hover:bg-[#1d4ed8] text-white shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105 ${isOpen ? "opacity-0 pointer-events-none" : "opacity-100"}`}
        aria-label="Open support chat"
      >
        <MessageCircle className="w-5 h-5" />
      </button>

      {/* Chat Form */}
      <div
        className={`fixed bottom-5 right-5 z-50 w-72 bg-white rounded-xl shadow-2xl overflow-hidden transition-all duration-200 ${isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}
      >
        {/* Header */}
        <div className="bg-[#1e40af] px-4 py-3 flex items-center justify-between">
          <span className="text-white text-sm font-medium">Support</span>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {submitted ? (
            <div className="text-center py-6">
              <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-[#1e40af]/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#1e40af]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-gray-700 font-medium">Message sent!</p>
              <p className="text-xs text-gray-500 mt-1">We'll respond within 4 hours.</p>
              <button
                onClick={handleClose}
                className="mt-4 text-xs text-[#1e40af] hover:underline"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <input
                  type="email"
                  placeholder="Email *"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e40af]/30 focus:border-[#1e40af] bg-gray-50 text-gray-900 placeholder:text-gray-400"
                />
              </div>
              <div>
                <input
                  type="tel"
                  placeholder="Phone (optional)"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e40af]/30 focus:border-[#1e40af] bg-gray-50 text-gray-900 placeholder:text-gray-400"
                />
              </div>
              <div>
                <textarea
                  placeholder="How can we help? *"
                  value={form.problem}
                  onChange={(e) => setForm({ ...form, problem: e.target.value })}
                  required
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e40af]/30 focus:border-[#1e40af] bg-gray-50 text-gray-900 placeholder:text-gray-400 resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-[#1e40af] hover:bg-[#1d4ed8] text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Send
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
};

export default SupportChatWidget;
