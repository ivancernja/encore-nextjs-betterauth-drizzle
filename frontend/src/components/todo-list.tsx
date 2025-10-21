"use client";

import { useEffect, useState } from "react";
import { TodoItem, Todo } from "./todo-item";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListTodo, Filter } from "lucide-react";

export function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [sortBy, setSortBy] = useState<"createdAt" | "dueDate" | "priority">("createdAt");

  const fetchTodos = async () => {
    try {
      const params = new URLSearchParams();

      if (filter === "active") {
        params.append("completed", "false");
      } else if (filter === "completed") {
        params.append("completed", "true");
      }

      params.append("sortBy", sortBy);
      params.append("sortOrder", "desc");

      const response = await fetch(`/api/todos?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch todos");
      }

      const data = await response.json();
      setTodos(data.todos || []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch todos");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, [filter, sortBy]);

  const stats = {
    total: todos.length,
    active: todos.filter((t) => !t.completed).length,
    completed: todos.filter((t) => t.completed).length,
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Loading todos...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ListTodo className="h-5 w-5" />
              My Todos
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{stats.active} active</span>
              <span>•</span>
              <span>{stats.completed} completed</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="flex items-center gap-2 flex-1">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <div className="flex gap-2">
                <Button
                  variant={filter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("all")}
                >
                  All ({stats.total})
                </Button>
                <Button
                  variant={filter === "active" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("active")}
                >
                  Active ({stats.active})
                </Button>
                <Button
                  variant={filter === "completed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("completed")}
                >
                  Completed ({stats.completed})
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort by:</span>
              <Select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as "createdAt" | "dueDate" | "priority")
                }
                className="w-auto"
              >
                <option value="createdAt">Date Created</option>
                <option value="dueDate">Due Date</option>
                <option value="priority">Priority</option>
              </Select>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/10 p-3 rounded mb-4">
              {error}
            </div>
          )}

          {todos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ListTodo className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium mb-1">No todos yet</p>
              <p className="text-sm">
                {filter === "all"
                  ? "Create your first todo to get started!"
                  : filter === "active"
                  ? "No active todos. Great job!"
                  : "No completed todos yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {todos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onUpdate={fetchTodos}
                  onDelete={fetchTodos}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
