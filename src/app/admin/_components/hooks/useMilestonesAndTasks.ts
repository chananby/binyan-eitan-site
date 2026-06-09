"use client";

import { useCallback, useState } from "react";

// Milestones + tasks add-forms and per-row mutation handlers. Pure-move
// from AdminPortal. `reload()` is the parent's data-refresh callback —
// called after every successful mutation so the rendered lists pick up
// the new state without a round-trip.

export function useMilestonesAndTasks(reload: () => void) {
  // Milestones
  const [expandedMs,      setExpandedMs]      = useState<Set<string>>(new Set());
  const [newMsProjectId,  setNewMsProjectId]  = useState("");
  const [newMsName,       setNewMsName]       = useState("");
  const [newMsTargetDate, setNewMsTargetDate] = useState("");
  const [msAddLoading,    setMsAddLoading]    = useState(false);
  const [msAddMsg,        setMsAddMsg]        = useState("");

  // Tasks
  const [newTaskMilestoneId, setNewTaskMilestoneId] = useState("");
  const [taskFilter,         setTaskFilter]         = useState("");
  const [newTaskProjectId,   setNewTaskProjectId]   = useState("");
  const [newTaskName,        setNewTaskName]        = useState("");
  const [newTaskStart,       setNewTaskStart]       = useState("");
  const [newTaskEnd,         setNewTaskEnd]         = useState("");
  const [newTaskContractor,  setNewTaskContractor]  = useState("");
  const [taskAddLoading,     setTaskAddLoading]     = useState(false);
  const [taskAddMsg,         setTaskAddMsg]         = useState("");

  const handleAddTask = useCallback(async (e: React.FormEvent) => {
    e.preventDefault(); setTaskAddLoading(true); setTaskAddMsg("");
    try {
      const res  = await fetch("/api/admin/tasks", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: newTaskProjectId, milestone_id: newTaskMilestoneId || null, task_name: newTaskName, start_date: newTaskStart || null, end_date: newTaskEnd || null, contractor: newTaskContractor }) });
      const data = await res.json();
      if (res.ok) {
        setTaskAddMsg("✓ " + newTaskName + " נוסף");
        setNewTaskName(""); setNewTaskStart(""); setNewTaskEnd(""); setNewTaskContractor(""); setNewTaskMilestoneId("");
        if (newTaskMilestoneId) setExpandedMs(prev => new Set([...prev, newTaskMilestoneId]));
        reload();
      }
      else        { setTaskAddMsg("שגיאה: " + (data.error ?? res.status)); }
    } catch (err) { setTaskAddMsg("שגיאת רשת: " + String(err)); }
    finally { setTaskAddLoading(false); }
  }, [newTaskProjectId, newTaskMilestoneId, newTaskName, newTaskStart, newTaskEnd, newTaskContractor, reload]);

  const setTaskStatus = useCallback(async (id: string, status: string) => {
    await fetch(`/api/admin/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    reload();
  }, [reload]);

  const handleAddMilestone = useCallback(async (e: React.FormEvent) => {
    e.preventDefault(); setMsAddLoading(true); setMsAddMsg("");
    try {
      const res  = await fetch("/api/admin/milestones", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: newMsProjectId, name: newMsName, target_date: newMsTargetDate || null }) });
      const data = await res.json();
      if (res.ok) {
        setMsAddMsg("✓ " + newMsName + " נוספה");
        setNewMsName(""); setNewMsTargetDate("");
        setExpandedMs(prev => new Set([...prev, data.milestone.id]));
        reload();
      } else { setMsAddMsg("שגיאה: " + (data.error ?? res.status)); }
    } catch (err) { setMsAddMsg("שגיאת רשת: " + String(err)); }
    finally { setMsAddLoading(false); }
  }, [newMsProjectId, newMsName, newMsTargetDate, reload]);

  const setMilestoneStatus = useCallback(async (id: string, status: string) => {
    await fetch(`/api/admin/milestones/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    reload();
  }, [reload]);

  const toggleMs = useCallback((id: string) => {
    setExpandedMs(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const assignTaskDay = useCallback(async (id: string, date: string | null) => {
    await fetch(`/api/admin/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ start_date: date ?? "" }) });
    reload();
  }, [reload]);

  return {
    expandedMs,        setExpandedMs,
    newMsProjectId,    setNewMsProjectId,
    newMsName,         setNewMsName,
    newMsTargetDate,   setNewMsTargetDate,
    msAddLoading,
    msAddMsg,

    newTaskMilestoneId, setNewTaskMilestoneId,
    taskFilter,         setTaskFilter,
    newTaskProjectId,   setNewTaskProjectId,
    newTaskName,        setNewTaskName,
    newTaskStart,       setNewTaskStart,
    newTaskEnd,         setNewTaskEnd,
    newTaskContractor,  setNewTaskContractor,
    taskAddLoading,
    taskAddMsg,

    handleAddTask,
    handleAddMilestone,
    setTaskStatus,
    setMilestoneStatus,
    toggleMs,
    assignTaskDay,
  };
}
