"use client";

import { User, Bell } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function SettingsPage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-200 sm:text-2xl">
          System & Account Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Manage your enterprise user profile, role permissions, and platform notifications.
        </p>
      </div>

      <div className="space-y-6">
        {/* User Account Card */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-200 flex items-center gap-2">
              <User className="h-4 w-4" /> User Account Profile
            </h2>
          </CardHeader>
          <CardBody className="flex flex-col gap-4 text-xs sm:text-sm">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-3">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Full Name</span>
              <span className="font-bold text-slate-900 dark:text-slate-200">{user.full_name || "Enterprise Analyst"}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-3">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Email Address</span>
              <span className="font-bold text-slate-900 dark:text-slate-200 font-mono">{user.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Assigned Roles</span>
              <div className="flex gap-1.5">
                {user.roles.map((role) => (
                  <Badge key={role} tone="info">{role}</Badge>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Monitoring Notification Preferences */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-200 flex items-center gap-2">
              <Bell className="h-4 w-4" /> Real-Time Price Alert Thresholds
            </h2>
          </CardHeader>
          <CardBody className="flex flex-col gap-4 text-xs sm:text-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 dark:text-slate-200 block">Competitor Price Drops Alert</span>
                <span className="text-slate-500 dark:text-slate-400 text-xs">Notify when target source prices drop &gt;5% below Excel base price.</span>
              </div>
              <Badge tone="success">Enabled</Badge>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-3">
              <div>
                <span className="font-bold text-slate-900 dark:text-slate-200 block">Daily Price Comparison Digest</span>
                <span className="text-slate-500 dark:text-slate-400 text-xs">Receive daily morning summary report of cross-source price changes.</span>
              </div>
              <Badge tone="success">Active</Badge>
            </div>
          </CardBody>
        </Card>

        {/* Platform Info */}
        <Card className="bg-slate-900 text-white border-slate-800">
          <CardBody className="flex flex-col gap-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400">Enterprise Engine Metadata</h3>
            <p className="text-xs text-slate-300">
              Product Intelligence Monitoring Engine v2.4.0 • FastAPI Backend • React 19 / Next.js Turbopack • PostgreSQL / SQLite Storage
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

