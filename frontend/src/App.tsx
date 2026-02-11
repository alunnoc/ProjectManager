import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { ProjectBoard } from "./features/board/ProjectBoard";
import { ProjectDiary } from "./features/diary/ProjectDiary";
import { ProjectCalendar } from "./features/calendar/ProjectCalendar";
import { ProjectConfig } from "./features/config/ProjectConfig";
import { ProjectSummary } from "./features/summary/ProjectSummary";
import { ProjectSelect } from "./components/ProjectSelect";

function RedirectToBoard() {
  const { projectId } = useParams<{ projectId: string }>();
  return <Navigate to={`/project/${projectId}/board`} replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<ProjectSelect />} />
        <Route path="project/:projectId/board" element={<ProjectBoard />} />
        <Route path="project/:projectId/diary" element={<ProjectDiary />} />
        <Route path="project/:projectId/calendar" element={<ProjectCalendar />} />
        <Route path="project/:projectId/summary" element={<ProjectSummary />} />
        <Route path="project/:projectId/config" element={<ProjectConfig />} />
        <Route path="project/:projectId" element={<RedirectToBoard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
