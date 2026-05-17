export interface DailyReport {
  id: string;
  project_id: string;
  date: string;
  weather: string | null;
  summary: string | null;
  special_events: string | null;
  created_at: string;
  project: { id: string; name: string } | null;
}
