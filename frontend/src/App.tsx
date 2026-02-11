import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { ProjectBoard } from "./features/board/ProjectBoard";
import { ProjectCalendar } from "./features/calendar/ProjectCalendar";
import { ProjectConfig } from "./features/config/ProjectConfig";
import { ProjectSummary } from "./features/summary/ProjectSummary";
import { ProjectSelect } from "./components/ProjectSelect";

function RedirectToDefaultTab() {
  const { projectId } = useParams<{ projectId: string }>();
  return <Navigate to={`/project/${projectId}/summary`} replace />;
}

function RedirectDiaryToCalendar() {
  const { projectId } = useParams<{ projectId: string }>();
  return <Navigate to={projectId ? `/project/${projectId}/calendar` : "/"} replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<ProjectSelect />} />
        <Route path="project/:projectId/board" element={<ProjectBoard />} />
        <Route path="project/:projectId/diary" element={<RedirectDiaryToCalendar />} />
        <Route path="project/:projectId/calendar" element={<ProjectCalendar />} />
        <Route path="project/:projectId/summary" element={<ProjectSummary />} />
        <Route path="project/:projectId/config" element={<ProjectConfig />} />
        <Route path="project/:projectId" element={<RedirectToDefaultTab />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
