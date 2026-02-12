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

/** Wrappa una pagina nel Layout (route piatte per evitare problemi di matching con nested routes) */
function WithLayout({ children }: { children: React.ReactNode }) {
  return <Layout>{children}</Layout>;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<WithLayout><ProjectSelect /></WithLayout>} />
      <Route path="/project/:projectId/board" element={<WithLayout><ProjectBoard /></WithLayout>} />
      <Route path="/project/:projectId/diary" element={<WithLayout><RedirectDiaryToCalendar /></WithLayout>} />
      <Route path="/project/:projectId/calendar" element={<WithLayout><ProjectCalendar /></WithLayout>} />
      <Route path="/project/:projectId/summary" element={<WithLayout><ProjectSummary /></WithLayout>} />
      <Route path="/project/:projectId/config" element={<WithLayout><ProjectConfig /></WithLayout>} />
      <Route path="/project/:projectId" element={<WithLayout><RedirectToDefaultTab /></WithLayout>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
