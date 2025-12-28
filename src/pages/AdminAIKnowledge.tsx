import { useState, useEffect } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminNavigation } from "@/hooks/useAdminSubdomain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { ArrowLeft, Plus, Pencil, Trash2, Brain, BookOpen, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  source: string;
  is_active: boolean;
  created_at: string;
}

const categories = ["general", "competition", "rewards", "account", "technical", "support", "learned"];

const AdminAIKnowledge = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const { adminNavigate, getDashboardPath } = useAdminNavigation();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "general",
  });

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) {
      navigate(isAdminSubdomain() ? '/' : '/admin');
      return;
    }
  }, [authLoading, isAdmin, navigate]);

  const { data: entries, isLoading } = useQuery({
    queryKey: ["ai-knowledge-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_ai_knowledge');
      if (error) throw error;
      return data as KnowledgeEntry[];
    },
    enabled: isAdmin,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (editingEntry) {
        const { error } = await supabase
          .from("ai_knowledge_base")
          .update({
            title: data.title,
            content: data.content,
            category: data.category,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingEntry.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("ai_knowledge_base")
          .insert({
            title: data.title,
            content: data.content,
            category: data.category,
            source: "manual",
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingEntry ? "Knowledge updated" : "Knowledge added");
      queryClient.invalidateQueries({ queryKey: ["ai-knowledge-admin"] });
      resetForm();
    },
    onError: (error: any) => {
      toast.error("Failed to save: " + error.message);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("ai_knowledge_base")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-knowledge-admin"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ai_knowledge_base")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entry deleted");
      queryClient.invalidateQueries({ queryKey: ["ai-knowledge-admin"] });
    },
    onError: (error: any) => {
      toast.error("Failed to delete: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({ title: "", content: "", category: "general" });
    setEditingEntry(null);
    setIsDialogOpen(false);
  };

  const openEdit = (entry: KnowledgeEntry) => {
    setEditingEntry(entry);
    setFormData({
      title: entry.title,
      content: entry.content,
      category: entry.category,
    });
    setIsDialogOpen(true);
  };

  const filteredEntries = entries?.filter(
    (e) => filterCategory === "all" || e.category === filterCategory
  );

  const getSourceBadge = (source: string) => {
    switch (source) {
      case "manual":
        return <Badge variant="outline" className="bg-blue-500/20 text-blue-400">Manual</Badge>;
      case "conversation":
        return <Badge variant="outline" className="bg-green-500/20 text-green-400">Learned</Badge>;
      default:
        return <Badge variant="secondary">{source}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => adminNavigate(getDashboardPath())}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              AI Knowledge Base
            </h1>
            <p className="text-muted-foreground">Teach the AI about PropScholar to improve suggestions</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Knowledge
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingEntry ? "Edit Knowledge" : "Add New Knowledge"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Refund Policy"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Content</label>
                  <Textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Detailed information the AI should know..."
                    rows={6}
                  />
                </div>
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
              <BookOpen className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{entries?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Total Entries</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Sparkles className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">
                {entries?.filter(e => e.is_active).length || 0}
              </p>
              <p className="text-xs text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">
                {entries?.filter(e => e.source === "manual").length || 0}
              </p>
              <p className="text-xs text-muted-foreground">Manual</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">
                {entries?.filter(e => e.source === "conversation").length || 0}
              </p>
              <p className="text-xs text-muted-foreground">Learned</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-4">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Knowledge Entries</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Loading...</p>
            ) : filteredEntries?.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No knowledge entries yet. Add information about PropScholar!
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Active</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries?.map((entry) => (
                    <TableRow key={entry.id} className={!entry.is_active ? "opacity-50" : ""}>
                      <TableCell>
                        <Switch
                          checked={entry.is_active}
                          onCheckedChange={(checked) => 
                            toggleActiveMutation.mutate({ id: entry.id, is_active: checked })
                          }
                        />
                      </TableCell>
                      <TableCell className="font-medium">{entry.title}</TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {entry.content}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{entry.category}</Badge>
                      </TableCell>
                      <TableCell>{getSourceBadge(entry.source)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(entry.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(entry)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => deleteMutation.mutate(entry.id)}
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

export default AdminAIKnowledge;
