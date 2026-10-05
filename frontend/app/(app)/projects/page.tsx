"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Folder } from "lucide-react";
import { api } from "@/lib/api";
import type { Project } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageLoading } from "@/components/ui/Spinner";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    api.get<Project[]>("/api/projects").then(setProjects);
  }, []);

  if (!projects) return <PageLoading />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-200 sm:text-2xl">
            Product Intelligence Projects
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Organize products and team members into isolated monitoring projects.
          </p>
        </div>
        <Button variant="gradient" onClick={() => setModalOpen(true)}>
          + New Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          title="No projects created yet"
          description="Create a project to start uploading products and configuring target sources."
          action={<Button variant="gradient" onClick={() => setModalOpen(true)}>Create Project</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="h-full hover:border-indigo-200 transition-all group">
                <CardBody className="flex flex-col justify-between h-full p-5 sm:p-6">
                  <div className="flex flex-col gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600">
                      <Folder className="h-5 w-5" />
                    </div>
                    <p className="font-extrabold text-slate-900 dark:text-slate-200 text-base group-hover:text-indigo-600 transition-colors mt-1">
                      {project.name}
                    </p>
                    <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {project.description || "No project description provided."}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-indigo-600 font-bold">
                    <span>Manage Project & Members</span>
                    <span>→</span>
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <CreateProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(project) => setProjects((prev) => [project, ...(prev ?? [])])}
      />
    </div>
  );
}

