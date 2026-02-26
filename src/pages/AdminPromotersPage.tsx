import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPromoterProfiles, updatePromoterStatus, PromoterProfile } from "@/lib/jobsApi";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Star, MapPin, Check, X, Briefcase, Calendar } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800",
  aprovado: "bg-green-100 text-green-800",
  bloqueado: "bg-red-100 text-red-800",
};

const AdminPromotersPage = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState("pendente");
  const [selected, setSelected] = useState<PromoterProfile | null>(null);

  const { data: promoters = [], isLoading } = useQuery({
    queryKey: ["promoter_profiles", tab],
    queryFn: () => fetchPromoterProfiles({ status: tab }),
  });

  // Fetch assignments for selected promoter
  const { data: promoterAssignments = [] } = useQuery({
    queryKey: ["promoter_assignments", selected?.id],
    queryFn: async () => {
      if (!selected) return [];
      const { data, error } = await supabase
        .from("job_assignments")
        .select("*, job:event_jobs(title, start_date, cache_value)")
        .eq("promoter_id", selected.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selected,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PromoterProfile['status'] }) => updatePromoterStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["promoter_profiles"] });
      toast({ title: "Status atualizado!" });
      setSelected(null);
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const RatingStars = ({ value, size = "h-3 w-3" }: { value: number; size?: string }) => (
    <div className="flex">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`${size} ${i < value ? "text-primary fill-primary" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Promotoras</h1>
        <p className="text-sm text-muted-foreground">Cadastro, aprovação e histórico de promotoras</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pendente">Pendentes</TabsTrigger>
          <TabsTrigger value="aprovado">Aprovadas</TabsTrigger>
          <TabsTrigger value="bloqueado">Bloqueadas</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {isLoading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : promoters.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhuma promotora nesta categoria</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {promoters.map((p) => (
                <Card key={p.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelected(p)}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                          {(p.stage_name || "P")[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{p.stage_name || "Sem nome"}</h3>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {p.city || "—"}{p.state ? `, ${p.state}` : ""}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <RatingStars value={Math.round(Number(p.avg_rating))} />
                          <span className="text-xs text-muted-foreground">{Number(p.avg_rating).toFixed(1)}</span>
                          <span className="text-xs text-muted-foreground">• {p.total_jobs} jobs</span>
                        </div>
                      </div>
                      <Badge className={statusColors[p.status]}>{p.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Perfil da Promotora</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                    {(selected.stage_name || "P")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{selected.stage_name || "Sem nome"}</h3>
                  <p className="text-sm text-muted-foreground">{selected.city}{selected.state ? `, ${selected.state}` : ""}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <RatingStars value={Math.round(Number(selected.avg_rating))} />
                    <span className="text-sm font-medium">{Number(selected.avg_rating).toFixed(1)}</span>
                  </div>
                </div>
              </div>

              {selected.bio && <p className="text-sm">{selected.bio}</p>}

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-muted rounded-lg p-2">
                  <p className="text-lg font-bold">{selected.total_jobs}</p>
                  <p className="text-xs text-muted-foreground">Jobs</p>
                </div>
                <div className="bg-muted rounded-lg p-2">
                  <p className="text-lg font-bold">{Number(selected.avg_rating).toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">Nota Média</p>
                </div>
                <div className="bg-muted rounded-lg p-2">
                  <p className="text-lg font-bold">{selected.service_radius_km || "—"}</p>
                  <p className="text-xs text-muted-foreground">Raio km</p>
                </div>
              </div>

              {selected.portfolio_urls.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Portfólio</p>
                  <div className="grid grid-cols-3 gap-2">
                    {selected.portfolio_urls.map((url, i) => (
                      <img key={i} src={url} className="rounded-lg aspect-square object-cover" alt="portfolio" />
                    ))}
                  </div>
                </div>
              )}

              {/* Assignment History with Ratings */}
              <Separator />
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <Briefcase className="h-4 w-4" /> Histórico de Eventos & Avaliações
                </h4>
                {promoterAssignments.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">Nenhum evento registrado</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {promoterAssignments.map((a: any) => (
                      <div key={a.id} className="bg-muted rounded-lg p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate">{a.job?.title || "Evento"}</span>
                          <Badge variant="outline" className="text-xs">{a.status}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {a.job?.start_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(a.job.start_date), "dd/MM/yyyy")}
                            </span>
                          )}
                          {a.job?.cache_value && (
                            <span>R$ {Number(a.job.cache_value).toFixed(2)}</span>
                          )}
                        </div>
                        
                        {/* Admin rating */}
                        {a.admin_rating ? (
                          <div className="flex items-center gap-2 text-xs pt-1">
                            <span className="text-muted-foreground">Admin:</span>
                            <RatingStars value={a.admin_rating} />
                            {a.admin_comment && <span className="italic text-muted-foreground">"{a.admin_comment}"</span>}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground/50 pt-1">Sem avaliação do admin</p>
                        )}

                        {/* Promoter rating */}
                        {a.promoter_rating && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">Promotora:</span>
                            <RatingStars value={a.promoter_rating} />
                            {a.promoter_comment && <span className="italic text-muted-foreground">"{a.promoter_comment}"</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {selected.status !== "aprovado" && (
                  <Button className="flex-1" onClick={() => statusMutation.mutate({ id: selected.id, status: "aprovado" })}>
                    <Check className="h-4 w-4 mr-1" /> Aprovar
                  </Button>
                )}
                {selected.status !== "bloqueado" && (
                  <Button variant="destructive" className="flex-1" onClick={() => statusMutation.mutate({ id: selected.id, status: "bloqueado" })}>
                    <X className="h-4 w-4 mr-1" /> Bloquear
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPromotersPage;
