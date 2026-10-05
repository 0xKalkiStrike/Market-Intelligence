"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { CredentialItem } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import { PageLoading } from "@/components/ui/Spinner";

export default function CredentialsPage() {
  const [credentials, setCredentials] = useState<CredentialItem[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("AWS");
  const [keyValue, setKeyValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get<CredentialItem[]>("/api/credentials").then(setCredentials).catch(() => setCredentials([]));
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const cred = await api.post<CredentialItem>("/api/credentials", { name, provider, key_value: keyValue });
      setCredentials((prev) => [cred, ...(prev ?? [])]);
      setName("");
      setKeyValue("");
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add credential");
    } finally {
      setSubmitting(false);
    }
  };

  if (!credentials) return <PageLoading />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-200 sm:text-2xl">
            API Tokens & Credentials
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Manage encrypted API tokens, scraper access keys, and proxy auth credentials.
          </p>
        </div>
        <Button variant="gradient" onClick={() => setModalOpen(true)}>
          + New Credential
        </Button>
      </div>

      <Card>
        <CardBody className="p-0 overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead className="border-b border-slate-200 dark:border-slate-800/60 bg-slate-50/80 dark:bg-slate-900/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3.5">Credential Name</th>
                <th className="px-4 py-3.5">Provider</th>
                <th className="px-4 py-3.5">Key Hint</th>
                <th className="px-4 py-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
              {credentials.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                    No encrypted credentials stored yet.
                  </td>
                </tr>
              ) : (
                credentials.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-slate-200">{c.name}</td>
                    <td className="px-4 py-3.5 text-xs font-semibold text-slate-700 dark:text-slate-300">{c.provider}</td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/60 rounded inline-block my-2">
                      {c.key_hint}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Badge tone={c.is_active ? "success" : "neutral"}>
                        {c.is_active ? "Active" : "Disabled"}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add API Credential">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          {error && <Alert tone="danger">{error}</Alert>}
          <Input label="Credential Name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Scraper API Key" />
          <Input label="Provider" required value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="e.g. AWS, ScrapeOps" />
          <Input label="API Key / Token" type="password" required value={keyValue} onChange={(e) => setKeyValue(e.target.value)} placeholder="••••••••••••••••" />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="gradient" isLoading={submitting}>Store Credential</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

