import { useParams } from "react-router-dom";
import logo from "../../images/Primary-logo.webp";
import { findProjectByPublicTimelineId } from "../lib/publicTimeline";
import ProjectTimelinePage from "./ProjectTimelinePage";

function PublicProjectTimelineViewPage({ projects }) {
  const { projectId } = useParams();
  const project = findProjectByPublicTimelineId(projects, projectId);

  return (
    <main className="grid h-screen overflow-hidden grid-rows-[69px_minmax(0,1fr)] bg-[#f5f7fb]">
      <header className="flex min-h-[69px] items-center justify-between gap-4 border-b border-[#d7dfeb] bg-white px-6">
        <div className="flex min-w-0 items-center gap-4">
          <img className="h-auto w-[142px] shrink-0" src={logo} alt="Gomo Group" />
          <div className="min-w-0">
            <h1 className="m-0 truncate text-[20px] leading-[1.25] font-semibold text-[#070c11]">
              {project?.name || "Project"} Timeline
            </h1>
            <p className="mt-1 text-sm text-[#667085]">
              Read-only project timeline and client action view
            </p>
          </div>
        </div>
      </header>

      <div className="min-h-0 overflow-x-hidden overflow-y-auto px-6 py-5">
        <ProjectTimelinePage projects={projects} readOnly />
      </div>
    </main>
  );
}

export default PublicProjectTimelineViewPage;
