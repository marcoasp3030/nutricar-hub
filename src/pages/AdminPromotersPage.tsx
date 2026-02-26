import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPromoterProfiles, updatePromoterStatus, PromoterProfile } from "@/lib/jobsApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, MapPin, Check, X, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PromoterProfile['status'] }) => updatePromoterStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["promoter_profiles"] });
      toast({ title: "Status atualizado!" });
      setSelected(null);
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

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
                          <div className="flex items-center gap-0.5 text-xs">
                            <Star className="h-3 w-3 text-yellow-500" />
                            {Number(p.avg_rating).toFixed(1)}
                          </div>
                          <span className="text-xs text-muted-foreground">{p.total_jobs} jobs</span>
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
        <DialogContent className="max-w-lg">
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
                  <p className="text-xs text-muted-foreground">Nota</p>
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
