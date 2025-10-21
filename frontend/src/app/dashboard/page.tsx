"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, LogOut, CheckSquare } from "lucide-react";
import { CreateTodoForm } from "@/components/create-todo-form";
import { TodoList } from "@/components/todo-list";

export default function Dashboard() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/sign-in");
    }
  }, [session, isPending, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  if (isPending) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </main>
    );
  }

  if (!session?.user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-muted-foreground">Redirecting...</div>
      </main>
    );
  }

  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="size-6 text-primary" />
            <span className="text-xl font-bold">TodoFlow</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {session.user.name}
            </span>
            <Button variant="ghost" size="sm">
              <Link href="/" className="inline-flex items-center gap-2">
                <Home className="size-4" />
                <span className="hidden sm:inline">Home</span>
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-2">
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-8">
        <div className="mx-auto max-w-5xl space-y-8">
          {/* Welcome Section */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">
              Welcome back, {session.user.name}
            </h1>
            <p className="text-lg text-muted-foreground">
              Organize your tasks and boost your productivity
            </p>
          </div>

          {/* Main Content Grid */}
          <div className="grid gap-8 lg:grid-cols-[1fr,2fr]">
            {/* Create Todo Form */}
            <div>
              <CreateTodoForm onTodoCreated={() => setRefreshKey((prev) => prev + 1)} />
            </div>

            {/* Todo List */}
            <div key={refreshKey}>
              <TodoList />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
