import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Image, ExternalLink } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { isAdminSubdomain } from "@/hooks/useAdminSubdomain";

interface OGImage {
  id: string;
  page_type: string;
  page_identifier: string | null;
  title: string | null;
  description: string | null;
  image_url: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

const PAGE_TYPES = [
  { value: "home", label: "Home Page" },
  { value: "blog", label: "Blog Competition" },
  { value: "reel", label: "Reel Competition" },
  { value: "rewards", label: "Rewards Page" },
  { value: "about", label: "About Page" },
  { value: "terms", label: "Terms Page" },
  { value: "privacy", label: "Privacy Page" },
];

export default function AdminOGImages() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<OGImage | null>(null);
  const [formData, setFormData] = useState({
    page_type: "home",
    page_identifier: "",
    title: "",
    description: "",
    image_url: "",
    is_default: false,
  });

  const isLoggedIn = sessionStorage.getItem('admin_logged_in') === 'true';

  useEffect(() => {
    if (!isLoggedIn) {
      navigate(isAdminSubdomain() ? '/' : '/admin', { replace: true });
    }
  }, [isLoggedIn, navigate]);

  const { data: ogImages, isLoading } = useQuery({
    queryKey: ["og-images"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_og_images');
      if (error) throw error;
      return data as OGImage[];
    },
    enabled: isLoggedIn,
  });

  const { data: events } = useQuery({
    queryKey: ["events-for-og"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_events');
      if (error) throw error;
      return data;
    },
    enabled: isLoggedIn,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        page_type: data.page_type,
        page_identifier: data.page_identifier || null,
        title: data.title || null,
        description: data.description || null,
        image_url: data.image_url,
        is_default: data.is_default,
      };

      if (editingImage) {
        const { error } = await supabase
          .from("og_images")
          .update(payload)
          .eq("id", editingImage.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("og_images").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["og-images"] });
      toast.success(editingImage ? "OG image updated" : "OG image added");
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to save: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("og_images").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["og-images"] });
      toast.success("OG image deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      page_type: "home",
      page_identifier: "",
      title: "",
      description: "",
      image_url: "",
      is_default: false,
    });
    setEditingImage(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (image: OGImage) => {
    setEditingImage(image);
    setFormData({
      page_type: image.page_type,
      page_identifier: image.page_identifier || "",
      title: image.title || "",
      description: image.description || "",
      image_url: image.image_url,
      is_default: image.is_default,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.image_url) {
      toast.error("Image URL is required");
      return;
    }
    saveMutation.mutate(formData);
  };

  const getPageLabel = (type: string) => {
    return PAGE_TYPES.find((p) => p.value === type)?.label || type;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              OG Images Hub
            </CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add OG Image
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingImage ? "Edit OG Image" : "Add OG Image"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Page Type</Label>
                      <Select
                        value={formData.page_type}
                        onValueChange={(v) =>
                          setFormData({ ...formData, page_type: v, page_identifier: "" })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAGE_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {(formData.page_type === "blog" || formData.page_type === "reel") && (
                      <div className="space-y-2">
                        <Label>Event (optional for default)</Label>
                        <Select
                          value={formData.page_identifier}
                          onValueChange={(v) =>
                            setFormData({ ...formData, page_identifier: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select event or leave empty for default" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Default for all {formData.page_type}s</SelectItem>
                            {events
                              ?.filter((e) => e.competition_type === formData.page_type)
                              .map((event) => (
                                <SelectItem key={event.slug} value={event.slug}>
                                  {event.title}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Title (optional override)</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Leave empty to use page title"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Description (optional override)</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Leave empty to use page description"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Image URL *</Label>
                    <Input
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      placeholder="https://example.com/og-image.png"
                      required
                    />
                    {formData.image_url && (
                      <div className="mt-2 rounded-lg overflow-hidden border">
                        <img
                          src={formData.image_url}
                          alt="Preview"
                          className="w-full h-32 object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_default}
                      onCheckedChange={(v) => setFormData({ ...formData, is_default: v })}
                    />
                    <Label>Set as default for this page type</Label>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : !ogImages?.length ? (
              <p className="text-muted-foreground">No OG images configured yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Preview</TableHead>
                    <TableHead>Page</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ogImages.map((image) => (
                    <TableRow key={image.id}>
                      <TableCell>
                        <img
                          src={image.image_url}
                          alt="OG"
                          className="w-24 h-14 object-cover rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/placeholder.svg";
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{getPageLabel(image.page_type)}</div>
                        {image.page_identifier && (
                          <div className="text-sm text-muted-foreground">
                            {image.page_identifier}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">{image.title || "-"}</div>
                      </TableCell>
                      <TableCell>
                        {image.is_default ? (
                          <span className="text-green-500">Yes</span>
                        ) : (
                          <span className="text-muted-foreground">No</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(image.image_url, "_blank")}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(image)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm("Delete this OG image?")) {
                                deleteMutation.mutate(image.id);
                              }
                            }}
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
}
