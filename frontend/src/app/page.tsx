"use client";

import { useSession } from "@/lib/auth-client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  CheckSquare,
  Calendar,
  Filter,
  Zap,
  Shield,
  Database,
  MoveRight
} from "lucide-react";

export default function Home() {
  const { data: session, isPending } = useSession();

  // Don't show loading screen, just render with null session initially
  // This prevents the flash and double-click issue

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="container px-4 pt-16 pb-12 sm:pt-20 sm:pb-16 md:pt-28 md:pb-20 lg:pt-32 lg:pb-24">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <div className="mb-4 inline-flex items-center rounded-full border px-2.5 py-1 text-xs sm:text-sm">
              <CheckSquare className="mr-1.5 size-3.5 sm:size-4" />
              Powerful Task Management
            </div>
            <h1 className="mb-4 text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
              Organize Your Life with TodoFlow
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-base text-muted-foreground sm:text-lg">
              A modern, intuitive todo application that helps you stay organized
              and productive. Manage tasks with priorities, due dates, and smart filtering.
            </p>
            
            {!isPending && session?.user ? (
              <div className="flex justify-center">
                <Button size="lg" asChild>
                  <Link href="/dashboard" className="inline-flex items-center gap-2">
                    <span>Go to Dashboard</span>
                    <MoveRight className="size-4" />
                  </Link>
                </Button>
              </div>
            ) : !isPending ? (
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button size="lg" asChild>
                  <Link href="/sign-up" className="inline-flex items-center gap-2">
                    <span>Get Started</span>
                    <MoveRight className="size-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/sign-in">Sign In</Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <div className="h-10 w-32 animate-pulse rounded-lg bg-muted" />
                <div className="h-10 w-24 animate-pulse rounded-lg bg-muted" />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container px-4 pb-16 md:pb-20">
        <div className="mb-8 text-center">
          <h2 className="mb-3 text-2xl font-semibold sm:text-3xl">
            Everything you need to stay productive
          </h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            Powerful features to help you manage your tasks effectively
          </p>
        </div>

        <div className="mx-auto max-w-5xl">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-3 rounded-lg border bg-card p-5">
              <CheckSquare className="size-5 shrink-0 text-primary" />
              <div>
                <h3 className="mb-1 text-sm font-semibold sm:text-base">
                  Task Management
                </h3>
                <p className="text-sm text-muted-foreground">
                  Create, edit, and complete tasks with ease. Stay on top of your work.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-lg border bg-card p-5">
              <Calendar className="size-5 shrink-0 text-primary" />
              <div>
                <h3 className="mb-1 text-sm font-semibold sm:text-base">
                  Due Dates
                </h3>
                <p className="text-sm text-muted-foreground">
                  Set deadlines and get visual indicators for overdue tasks.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-lg border bg-card p-5">
              <Filter className="size-5 shrink-0 text-primary" />
              <div>
                <h3 className="mb-1 text-sm font-semibold sm:text-base">
                  Smart Filtering
                </h3>
                <p className="text-sm text-muted-foreground">
                  Filter by status, priority, and sort tasks to focus on what matters.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-lg border bg-card p-5">
              <Zap className="size-5 shrink-0 text-primary" />
              <div>
                <h3 className="mb-1 text-sm font-semibold sm:text-base">
                  Priority Levels
                </h3>
                <p className="text-sm text-muted-foreground">
                  Organize tasks by priority: low, medium, or high importance.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Technology Stack Section */}
        <div className="mx-auto max-w-5xl mt-16">
          <div className="mb-8 text-center">
            <h2 className="mb-3 text-2xl font-semibold sm:text-3xl">
              Built with modern technology
            </h2>
            <p className="text-sm text-muted-foreground sm:text-base">
              Powered by a production-ready stack
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
              <Shield className="size-5 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold">Secure Authentication</h3>
                <p className="text-xs text-muted-foreground">BetterAuth</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
              <Database className="size-5 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold">Type-safe Database</h3>
                <p className="text-xs text-muted-foreground">PostgreSQL + Drizzle</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
              <Zap className="size-5 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold">Modern Stack</h3>
                <p className="text-xs text-muted-foreground">Next.js + Encore.ts</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
