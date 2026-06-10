"use client";

import React from "react";
import dynamic from "next/dynamic";
import WeeklyPlanner from "../../../components/WeeklyPlanner";
import { TabRefreshBar } from "../shared/TabRefreshBar";

// ReportsTab stays lazy — heavy form + reports list. Moving the dynamic
// import here removes it from AdminPortal.tsx so the parent doesn't keep
// a top-level dependency on a component it only mounts conditionally.
const ReportsTab = dynamic(() => import("./ReportsTab"), {
  loading: () => <div className="text-sm text-charcoal/55 text-center py-8">טוען דוחות...</div>,
});

interface ProjectLite {
  id: string;
  name: string;
  status?: string;
}

type CommonProps = {
  activeProjects: ProjectLite[];
  lastRefreshed:  Date | null;
  refreshing:     boolean;
  onTabRefresh:   () => void;
};

export function ReportsTabPanel(props: CommonProps) {
  return (
    <ReportsTab
      activeProjects={props.activeProjects}
      lastRefreshed={props.lastRefreshed}
      refreshing={props.refreshing}
      onTabRefresh={props.onTabRefresh}
    />
  );
}

type MatrixProps = CommonProps & { dataLoading: boolean };

export function MatrixTabPanel({ activeProjects, lastRefreshed, refreshing, onTabRefresh, dataLoading }: MatrixProps) {
  return (
    <div className="space-y-3">
      <TabRefreshBar loading={refreshing || dataLoading} onRefresh={onTabRefresh} lastRefreshed={lastRefreshed} />
      <div className="p-1">
        <WeeklyPlanner projects={activeProjects} />
      </div>
    </div>
  );
}
