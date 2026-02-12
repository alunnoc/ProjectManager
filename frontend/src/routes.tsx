import { createBrowserRouter, Navigate, useParams } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { ProjectSelect } from "./components/ProjectSelect";
import { ProjectBoard } from "./features/board/ProjectBoard";
import { ProjectCalendar } from "./features/calendar/ProjectCalendar";
import { ProjectConfig } from "./features/config/ProjectConfig";
import { ProjectSummary } from "./features/summary/ProjectSummary";

function RedirectToDefaultTab() {
  const { projectId } = useParams<{ projectId: string }>();
  return <Navigate to={projectId ? `/project/${projectId}/summary` : "/"} replace />;
}

function RedirectDiaryToCalendar() {
  const { projectId } = useParams<{ projectId: string }>();
  return <Navigate to={projectId ? `/project/${projectId}/calendar` : "/"} replace />;
}

export const router = createBrowserRouter([
  {
    path: "*",
    element: <Layout />,
    children: [
      { index: true, element: <ProjectSelect /> },
      { path: "project/:projectId/board", element: <ProjectBoard /> },
      { path: "project/:projectId/diary", element: <RedirectDiaryToCalendar /> },
      { path: "project/:projectId/calendar", element: <ProjectCalendar /> },
      { path: "project/:projectId/summary", element: <ProjectSummary /> },
      { path: "project/:projectId/config", element: <ProjectConfig /> },
      { path: "project/:projectId", element: <RedirectToDefaultTab /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
