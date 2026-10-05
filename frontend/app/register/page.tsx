"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Card, CardBody } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth-context";

export default function RegisterPage() {
  const { login } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/api/auth/register", { email, password, full_name: fullName });
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed. Try a different email.");
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f172a] p-4 sm:p-6">
      <div className="w-full max-w-md">
        {/* Brand Icon Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-lg shadow-sm mb-3">
            MI
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl">
            Market Intelligence
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Create Account & Access Platform
          </p>
        </div>

        <Card className="border-slate-800 bg-slate-900 shadow-xl rounded-2xl">
          <CardBody className="p-6 sm:p-8">
            <h2 className="mb-1 text-lg font-bold text-white">Create Account</h2>
            <p className="mb-6 text-xs text-slate-400">
              Join your organization's market intelligence & analytics workspace.
            </p>

            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              {error && <Alert tone="danger">{error}</Alert>}

              <Input
                label="Full Name"
                labelClassName="text-slate-300"
                required
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500"
              />

              <Input
                label="Email Address"
                labelClassName="text-slate-300"
                type="email"
                required
                placeholder="john@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500"
              />

              <Input
                label="Password (min. 8 chars)"
                labelClassName="text-slate-300"
                type="password"
                required
                minLength={8}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500"
              />

              <Button type="submit" variant="indigo" size="lg" isLoading={submitting} className="w-full mt-2 font-semibold">
                Create Account & Sign In →
              </Button>
            </form>

            <div className="mt-6 border-t border-slate-800 pt-4 text-center">
              <p className="text-xs text-slate-400">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-indigo-400 hover:text-indigo-300 underline">
                  Sign in
                </Link>
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

