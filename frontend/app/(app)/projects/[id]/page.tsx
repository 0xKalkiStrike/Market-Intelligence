"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Folder } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Project, ProjectMember } from "@/lib/types";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { PageLoading } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[] | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get<Project>(`/api/projects/${id}`).then(setProject);
    api.get<ProjectMember[]>(`/api/projects/${id}/members`).then(setMembers);
  }, [id]);

  const addMember = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const member = await api.post<ProjectMember>(`/api/projects/${id}/members`, { user_email: email });
      setMembers((prev) => [...(prev ?? []), member]);
      setEmail("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add member");
    } finally {
      setSubmitting(false);
    }
  };

  const removeMember = async (memberId: string) => {
    await api.delete(`/api/projects/${id}/members/${memberId}`);
    setMembers((prev) => (prev ?? []).filter((m) => m.id !== memberId));
  };

  if (!project || !members) return <PageLoading />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 border border-indigo-100 dark:border-indigo-800/60 shrink-0">
          <Folder className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-200 sm:text-2xl">{project.name}</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">{project.description || "No description provided."}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-200">Project Workspace Members</h2>
        </CardHeader>
        <CardBody className="flex flex-col gap-5">
          {error && <Alert tone="danger">{error}</Alert>}
          <form onSubmit={addMember} className="flex items-end gap-3 max-w-xl">
            <Input
              label="Add Team Member by Email"
              placeholder="user@company.com"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" variant="indigo" isLoading={submitting} className="shrink-0">
              Add Member
            </Button>
          </form>

          <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/60 px-4">
            {members.length === 0 && <p className="py-4 text-xs text-slate-500 dark:text-slate-400">No project members assigned yet.</p>}
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between py-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white font-bold text-xs">
                    {member.user_email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-200">{member.user_email}</p>
                    <Badge tone="info" className="mt-0.5">{member.project_role}</Badge>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeMember(member.id)} className="text-rose-600 hover:bg-rose-50 hover:text-rose-700">
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

