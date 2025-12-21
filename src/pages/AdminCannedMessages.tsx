import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminNavigation } from "@/hooks/useAdminSubdomain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Plus, Pencil, Trash2, MessageSquare, Copy } from "lucide-react";
import { toast } from "sonner";

interface CannedMessage {
  id: string;
  title: string;
  content: string;
  category: string;
  shortcut: string | null;
  created_at: string;
}

const categories = ["greeting", "closing", "info", "escalation", "account", "competition", "technical", "general"];

const AdminCannedMessages = () => {
  const navigate = useNavigate();
  const { adminNavigate } = useAdminNavigation();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<CannedMessage | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "general",
    shortcut: "",
  });

  const isLoggedIn = sessionStorage.getItem('admin_logged_in') === 'true';

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/admin');
    }
  }, [isLoggedIn, navigate]);

  const { data: messages, isLoading } = useQuery({
    queryKey: ["canned-messages-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_canned_messages');
      if (error) throw error;
      return data as CannedMessage[];
    },
    enabled: isLoggedIn,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (editingMessage) {
        const { error } = await supabase
          .from("canned_messages")
          .update({
            title: data.title,
            content: data.content,
            category: data.category,
            shortcut: data.shortcut || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingMessage.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("canned_messages")
          .insert({
            title: data.title,
            content: data.content,
            category: data.category,
            shortcut: data.shortcut || null,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingMessage ? "Message updated" : "Message created");
      queryClient.invalidateQueries({ queryKey: ["canned-messages-admin"] });
      resetForm();
    },
    onError: (error: any) => {
      toast.error("Failed to save: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("canned_messages")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Message deleted");
      queryClient.invalidateQueries({ queryKey: ["canned-messages-admin"] });
    },
    onError: (error: any) => {
      toast.error("Failed to delete: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({ title: "", content: "", category: "general", shortcut: "" });
    setEditingMessage(null);
    setIsDialogOpen(false);
  };

  const openEdit = (message: CannedMessage) => {
    setEditingMessage(message);
    setFormData({
      title: message.title,
      content: message.content,
      category: message.category,
      shortcut: message.shortcut || "",
    });
    setIsDialogOpen(true);
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Copied!");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => adminNavigate("/tickets")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Canned Messages</h1>
            <p className="text-muted-foreground">Manage quick reply templates for support</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Message
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingMessage ? "Edit Message" : "Add New Message"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Greeting"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Content</label>
                  <Textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="The message content..."
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Shortcut (optional)</label>
                    <Input
                      value={formData.shortcut}
                      onChange={(e) => setFormData({ ...formData, shortcut: e.target.value })}
                      placeholder="e.g., /hi"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={resetForm}>Cancel</Button>
                  <Button 
                    onClick={() => saveMutation.mutate(formData)}
                    disabled={!formData.title || !formData.content || saveMutation.isPending}
                  >
                    {saveMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{messages?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Total Messages</p>
            </CardContent>
          </Card>
          {["greeting", "closing", "info"].map((cat) => (
            <Card key={cat}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">
                  {messages?.filter(m => m.category === cat).length || 0}
                </p>
                <p className="text-xs text-muted-foreground capitalize">{cat}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Messages</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Loading...</p>
            ) : messages?.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No canned messages yet. Add your first one!
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Shortcut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages?.map((msg) => (
                    <TableRow key={msg.id}>
                      <TableCell className="font-medium">{msg.title}</TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {msg.content}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{msg.category}</Badge>
                      </TableCell>
                      <TableCell>
                        {msg.shortcut && (
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {msg.shortcut}
                          </code>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyToClipboard(msg.content)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(msg)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => deleteMutation.mutate(msg.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminCannedMessages;
