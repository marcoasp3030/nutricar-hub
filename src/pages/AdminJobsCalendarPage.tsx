import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchEventJobs, EventJob } from "@/lib/jobsApi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, Clock,
  MapPin, DollarSign, Users,
} from "lucide-react";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  addMonths, subMonths, addWeeks, subWeeks, isSameMonth, isSameDay, isToday,
  parseISO, getWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho", publicado: "Publicado", em_negociacao: "Em Negociação",
  confirmado: "Confirmado", em_execucao: "Em Execução", concluido: "Concluído", cancelado: "Cancelado",
};

const statusDotColors: Record<string, string> = {
  rascunho: "bg-muted-foreground",
  publicado: "bg-primary",
  em_negociacao: "bg-yellow-500",
  confirmado: "bg-green-500",
  em_execucao: "bg-blue-500",
  concluido: "bg-muted-foreground",
  cancelado: "bg-destructive",
};

type ViewMode = "month" | "week";

export default function AdminJobsCalendarPage() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["event_jobs_calendar"],
    queryFn: () => fetchEventJobs(),
  });

  const filtered = useMemo(() => {
    if (statusFilter === "all") return jobs;
    return jobs.filter(j => j.status === statusFilter);
  }, [jobs, statusFilter]);

  // Map jobs to dates
  const jobsByDate = useMemo(() => {
    const map = new Map<string, EventJob[]>();
    filtered.forEach(job => {
      const start = job.start_date?.split("T")[0];
      const end = job.end_date?.split("T")[0];
      if (!start) return;
      // Add job to each day in range
      try {
        const startD = parseISO(start);
        const endD = end ? parseISO(end) : startD;
        const days = eachDayOfInterval({ start: startD, end: endD });
        days.forEach(day => {
          const key = format(day, "yyyy-MM-dd");
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push(job);
        });
      } catch {
        const key = start;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(job);
      }
    });
    return map;
  }, [filtered]);

  // Calendar grid days
  const calendarDays = useMemo(() => {
    if (viewMode === "month") {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const gridStart = startOfWeek(monthStart, { locale: ptBR });
      const gridEnd = endOfWeek(monthEnd, { locale: ptBR });
      return eachDayOfInterval({ start: gridStart, end: gridEnd });
    } else {
      const weekStart = startOfWeek(currentDate, { locale: ptBR });
      const weekEnd = endOfWeek(currentDate, { locale: ptBR });
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    }
  }, [currentDate, viewMode]);

  const navigate_ = (dir: "prev" | "next") => {
    if (viewMode === "month") {
      setCurrentDate(dir === "prev" ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    } else {
      setCurrentDate(dir === "prev" ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
    }
  };

  const goToday = () => setCurrentDate(new Date());

  const headerLabel = viewMode === "month"
    ? format(currentDate, "MMMM yyyy", { locale: ptBR })
    : `Semana ${getWeek(currentDate, { locale: ptBR })} — ${format(startOfWeek(currentDate, { locale: ptBR }), "dd/MM")} a ${format(endOfWeek(currentDate, { locale: ptBR }), "dd/MM/yyyy")}`;

  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const selectedDayJobs = selectedDay
    ? jobsByDate.get(format(selectedDay, "yyyy-MM-dd")) || []
    : [];

  // Stats
  const totalJobsThisPeriod = useMemo(() => {
    const uniqueIds = new Set<string>();
    calendarDays.forEach(day => {
      const key = format(day, "yyyy-MM-dd");
      jobsByDate.get(key)?.forEach(j => uniqueIds.add(j.id));
    });
    return uniqueIds.size;
  }, [calendarDays, jobsByDate]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calendário de Jobs</h1>
          <p className="text-sm text-muted-foreground">
            {totalJobsThisPeriod} job(s) no período
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/jobs")}>
            <List className="h-4 w-4 mr-1" /> Lista
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate_("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToday} className="text-sm font-medium">
            Hoje
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate_("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold capitalize ml-2">{headerLabel}</span>
        </div>
        <div className="flex gap-2">
          <Select value={viewMode} onValueChange={v => setViewMode(v as ViewMode)}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Mês</SelectItem>
              <SelectItem value="week">Semana</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              {Object.entries(statusLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          {/* Day names header */}
          <div className="grid grid-cols-7 border-b bg-muted/50">
            {dayNames.map(d => (
              <div key={d} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className={`grid grid-cols-7 ${viewMode === "week" ? "min-h-[200px]" : ""}`}>
            {calendarDays.map((day, i) => {
              const key = format(day, "yyyy-MM-dd");
              const dayJobs = jobsByDate.get(key) || [];
              const isCurrentMonth = isSameMonth(day, currentDate);
              const today = isToday(day);

              return (
                <div
                  key={key}
                  className={`
                    border-b border-r p-1 min-h-[90px] cursor-pointer transition-colors hover:bg-accent/30
                    ${!isCurrentMonth && viewMode === "month" ? "bg-muted/30" : ""}
                    ${today ? "bg-primary/5" : ""}
                  `}
                  onClick={() => dayJobs.length > 0 && setSelectedDay(day)}
                >
                  <div className={`text-xs font-medium mb-1 px-1 ${today ? "text-primary font-bold" : !isCurrentMonth && viewMode === "month" ? "text-muted-foreground/50" : "text-foreground"}`}>
                    {format(day, "d")}
                  </div>
                  <div className="space-y-0.5">
                    {dayJobs.slice(0, viewMode === "week" ? 6 : 3).map(job => (
                      <div
                        key={job.id}
                        className="flex items-center gap-1 px-1 py-0.5 rounded text-[10px] leading-tight bg-accent/50 truncate"
                        title={`${job.title} — ${statusLabels[job.status]}`}
                      >
                        <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${statusDotColors[job.status]}`} />
                        <span className="truncate">{job.title}</span>
                      </div>
                    ))}
                    {dayJobs.length > (viewMode === "week" ? 6 : 3) && (
                      <div className="text-[10px] text-muted-foreground px-1">
                        +{dayJobs.length - (viewMode === "week" ? 6 : 3)} mais
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Day detail dialog */}
      <Dialog open={!!selectedDay} onOpenChange={open => { if (!open) setSelectedDay(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDay && format(selectedDay, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {selectedDayJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum job neste dia.</p>
            ) : (
              selectedDayJobs.map(job => (
                <Card key={job.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/admin/jobs")}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{job.title}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${statusDotColors[job.status]}`} />
                        {statusLabels[job.status]}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {job.start_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {job.start_time}{job.end_time && ` – ${job.end_time}`}
                        </span>
                      )}
                      {(job.address || job.store_unit) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {job.store_unit || job.address}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        R$ {Number(job.cache_value).toFixed(2)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {job.promoter_slots} vaga(s)
                      </span>
                    </div>
                    {job.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{job.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}