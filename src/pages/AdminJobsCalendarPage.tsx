import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchEventJobs, EventJob, upsertEventJob } from "@/lib/jobsApi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ChevronLeft, ChevronRight, List, Clock, MapPin, DollarSign, Users, GripVertical,
} from "lucide-react";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  addMonths, subMonths, addWeeks, subWeeks, isSameMonth, isToday,
  parseISO, getWeek, differenceInCalendarDays, addDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
  useDroppable, useDraggable,
} from "@dnd-kit/core";
import { toast } from "@/hooks/use-toast";

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

// Predefined palette for event types (HSL-based for theme consistency)
const EVENT_TYPE_COLORS = [
  "hsl(220, 70%, 55%)",  // blue
  "hsl(340, 70%, 55%)",  // pink
  "hsl(160, 60%, 45%)",  // teal
  "hsl(30, 80%, 55%)",   // orange
  "hsl(270, 60%, 55%)",  // purple
  "hsl(50, 80%, 48%)",   // gold
  "hsl(190, 70%, 45%)",  // cyan
  "hsl(0, 65%, 55%)",    // red
  "hsl(130, 50%, 45%)",  // green
  "hsl(300, 50%, 55%)",  // magenta
];

const NO_TYPE_COLOR = "hsl(var(--muted-foreground) / 0.3)";

function getEventTypeColorMap(jobs: EventJob[]): Map<string, { color: string; name: string }> {
  const map = new Map<string, { color: string; name: string }>();
  let idx = 0;
  jobs.forEach(job => {
    const typeId = job.event_type_id;
    if (typeId && !map.has(typeId)) {
      const et = job.event_type as any;
      const typeName = et?.name || "Tipo desconhecido";
      const customColor = et?.color;
      map.set(typeId, { color: customColor || EVENT_TYPE_COLORS[idx % EVENT_TYPE_COLORS.length], name: typeName });
      idx++;
    }
  });
  return map;
}

type ViewMode = "month" | "week";

// ─── Draggable Job Chip ───
function DraggableJob({ job, id, typeColor }: { job: EventJob; id: string; typeColor?: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, data: { job } });
  const bgColor = typeColor || NO_TYPE_COLOR;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ borderLeftColor: bgColor, borderLeftWidth: 3 }}
      className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] leading-tight bg-accent/60 truncate cursor-grab active:cursor-grabbing select-none transition-opacity ${isDragging ? "opacity-30" : ""}`}
      title={`${job.title} — ${statusLabels[job.status]} (arraste para reagendar)`}
    >
      <GripVertical className="h-2.5 w-2.5 shrink-0 text-muted-foreground/60" />
      <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${statusDotColors[job.status]}`} />
      <span className="truncate">{job.title}</span>
    </div>
  );
}

// ─── Droppable Day Cell ───
function DroppableDay({
  day, dayJobs, isCurrentMonth, viewMode, onDayClick, colorMap,
}: {
  day: Date;
  dayJobs: EventJob[];
  isCurrentMonth: boolean;
  viewMode: ViewMode;
  onDayClick: (day: Date) => void;
  colorMap: Map<string, { color: string; name: string }>;
}) {
  const key = format(day, "yyyy-MM-dd");
  const today = isToday(day);
  const { setNodeRef, isOver } = useDroppable({ id: `day-${key}`, data: { date: key } });
  const maxVisible = viewMode === "week" ? 10 : 4;

  // Deduplicate jobs by id (a multi-day job appears once per cell)
  const uniqueJobs = useMemo(() => {
    const seen = new Set<string>();
    return dayJobs.filter(j => {
      if (seen.has(j.id)) return false;
      seen.add(j.id);
      return true;
    });
  }, [dayJobs]);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "border-b border-r p-1.5 transition-colors flex flex-col",
        viewMode === "week" ? "min-h-[280px]" : "min-h-[110px]",
        !isCurrentMonth && viewMode === "month" ? "bg-muted/30" : "",
        today ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : "",
        isOver ? "bg-primary/10 ring-2 ring-inset ring-primary/40" : "",
      )}
      onClick={() => uniqueJobs.length > 0 && onDayClick(day)}
    >
      <div className={cn(
        "text-xs font-medium mb-1 px-0.5 flex items-center justify-between",
        today ? "text-primary font-bold" : !isCurrentMonth && viewMode === "month" ? "text-muted-foreground/50" : "text-foreground"
      )}>
        <span>{format(day, "d")}</span>
        {uniqueJobs.length > 0 && (
          <span className="text-[9px] text-muted-foreground font-normal">{uniqueJobs.length}</span>
        )}
      </div>
      <div className="space-y-0.5 flex-1 overflow-y-auto">
        {uniqueJobs.slice(0, maxVisible).map(job => (
          <DraggableJob key={`${key}-${job.id}`} job={job} id={`${key}::${job.id}`} typeColor={job.event_type_id ? colorMap.get(job.event_type_id)?.color : undefined} />
        ))}
        {uniqueJobs.length > maxVisible && (
          <button className="text-[10px] text-primary hover:underline px-1 w-full text-left" onClick={(e) => { e.stopPropagation(); onDayClick(day); }}>
            +{uniqueJobs.length - maxVisible} mais
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Overlay shown while dragging ───
function JobDragOverlay({ job, typeColor }: { job: EventJob; typeColor?: string }) {
  return (
    <div
      style={{ borderLeftColor: typeColor || NO_TYPE_COLOR, borderLeftWidth: 3 }}
      className="flex items-center gap-1 px-2 py-1 rounded-r bg-card border shadow-lg text-xs font-medium max-w-[180px]"
    >
      <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${statusDotColors[job.status]}`} />
      <span className="truncate">{job.title}</span>
    </div>
  );
}

// ─── Main Page ───
export default function AdminJobsCalendarPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [activeJob, setActiveJob] = useState<EventJob | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["event_jobs_calendar"],
    queryFn: () => fetchEventJobs(),
  });

  const eventTypeColorMap = useMemo(() => getEventTypeColorMap(jobs), [jobs]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return jobs;
    return jobs.filter(j => j.status === statusFilter);
  }, [jobs, statusFilter]);

  const jobsByDate = useMemo(() => {
    const map = new Map<string, EventJob[]>();
    filtered.forEach(job => {
      const start = job.start_date?.split("T")[0];
      const end = job.end_date?.split("T")[0];
      if (!start) return;
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
        if (!map.has(start)) map.set(start, []);
        map.get(start)!.push(job);
      }
    });
    return map;
  }, [filtered]);

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

  const nav = (dir: "prev" | "next") => {
    if (viewMode === "month") {
      setCurrentDate(dir === "prev" ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    } else {
      setCurrentDate(dir === "prev" ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
    }
  };

  const headerLabel = viewMode === "month"
    ? format(currentDate, "MMMM yyyy", { locale: ptBR })
    : `Semana ${getWeek(currentDate, { locale: ptBR })} — ${format(startOfWeek(currentDate, { locale: ptBR }), "dd/MM")} a ${format(endOfWeek(currentDate, { locale: ptBR }), "dd/MM/yyyy")}`;

  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const selectedDayJobs = selectedDay
    ? jobsByDate.get(format(selectedDay, "yyyy-MM-dd")) || []
    : [];

  const totalJobsThisPeriod = useMemo(() => {
    const uniqueIds = new Set<string>();
    calendarDays.forEach(day => {
      const key = format(day, "yyyy-MM-dd");
      jobsByDate.get(key)?.forEach(j => uniqueIds.add(j.id));
    });
    return uniqueIds.size;
  }, [calendarDays, jobsByDate]);

  // ─── Drag handlers ───
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const job = event.active.data.current?.job as EventJob | undefined;
    if (job) setActiveJob(job);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveJob(null);
    const { active, over } = event;
    if (!over) return;

    const job = active.data.current?.job as EventJob | undefined;
    if (!job) return;

    // Extract source date from draggable id (format: "yyyy-MM-dd::jobId")
    const sourceDateStr = (active.id as string).split("::")[0];
    // Extract target date from droppable id (format: "day-yyyy-MM-dd")
    const targetDateStr = (over.id as string).replace("day-", "");

    if (sourceDateStr === targetDateStr) return;

    // Calculate offset in days
    const sourceDate = parseISO(sourceDateStr);
    const targetDate = parseISO(targetDateStr);
    const dayOffset = differenceInCalendarDays(targetDate, sourceDate);

    const oldStart = job.start_date?.split("T")[0];
    const oldEnd = job.end_date?.split("T")[0];
    if (!oldStart || !oldEnd) return;

    const newStart = format(addDays(parseISO(oldStart), dayOffset), "yyyy-MM-dd");
    const newEnd = format(addDays(parseISO(oldEnd), dayOffset), "yyyy-MM-dd");

    // Optimistic update
    queryClient.setQueryData<EventJob[]>(["event_jobs_calendar"], (old) =>
      (old || []).map(j =>
        j.id === job.id ? { ...j, start_date: newStart, end_date: newEnd } : j
      )
    );

    try {
      await upsertEventJob({ id: job.id, start_date: newStart, end_date: newEnd, title: job.title, created_by: job.created_by });
      toast({ title: "Evento reagendado", description: `${job.title} → ${format(parseISO(newStart), "dd/MM")} a ${format(parseISO(newEnd), "dd/MM")}` });
    } catch (e: any) {
      // Rollback
      queryClient.invalidateQueries({ queryKey: ["event_jobs_calendar"] });
      toast({ title: "Erro ao reagendar", description: e.message, variant: "destructive" });
    }
  }, [queryClient]);

  return (
    <div className="-m-4 lg:-m-6 flex flex-col" style={{ height: "calc(100vh - 64px)" }}>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 lg:px-6 pt-4 lg:pt-5 pb-3">
        <div>
          <h1 className="text-xl font-bold">Calendário de Eventos</h1>
          <p className="text-xs text-muted-foreground">
            {totalJobsThisPeriod} evento(s) no período · Arraste para reagendar
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/admin/jobs")}>
          <List className="h-4 w-4 mr-1" /> Lista
        </Button>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-4 lg:px-6 pb-2">
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => nav("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())} className="text-xs h-7 px-2">
            Hoje
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => nav("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold capitalize ml-2">{headerLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Legend inline */}
          {eventTypeColorMap.size > 0 && (
            <div className="hidden md:flex items-center gap-2 text-[10px] text-muted-foreground mr-2">
              {Array.from(eventTypeColorMap.entries()).map(([id, { color, name }]) => (
                <span key={id} className="flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                  {name}
                </span>
              ))}
            </div>
          )}
          <Select value={viewMode} onValueChange={v => setViewMode(v as ViewMode)}>
            <SelectTrigger className="w-[100px] h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Mês</SelectItem>
              <SelectItem value="week">Semana</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px] h-7 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(statusLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex justify-center items-center">
          <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex-1 flex flex-col border-t bg-card overflow-hidden">
            {/* Day names header */}
            <div className="grid grid-cols-7 border-b bg-muted/40">
              {dayNames.map(d => (
                <div key={d} className="px-2 py-1.5 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid — fills remaining height */}
            <div className={cn(
              "grid grid-cols-7 flex-1",
              viewMode === "week" ? "" : "",
            )}>
              {calendarDays.map(day => {
                const key = format(day, "yyyy-MM-dd");
                const dayJobs = jobsByDate.get(key) || [];
                const isCurrentMonth = isSameMonth(day, currentDate);

                return (
                  <DroppableDay
                    key={key}
                    day={day}
                    dayJobs={dayJobs}
                    isCurrentMonth={isCurrentMonth}
                    viewMode={viewMode}
                    onDayClick={setSelectedDay}
                    colorMap={eventTypeColorMap}
                  />
                );
              })}
            </div>
          </div>

          <DragOverlay dropAnimation={null}>
            {activeJob ? <JobDragOverlay job={activeJob} typeColor={activeJob.event_type_id ? eventTypeColorMap.get(activeJob.event_type_id)?.color : undefined} /> : null}
          </DragOverlay>
        </DndContext>
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
              <p className="text-sm text-muted-foreground">Nenhum evento neste dia.</p>
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