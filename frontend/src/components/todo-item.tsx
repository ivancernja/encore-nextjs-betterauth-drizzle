"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Trash2, Calendar, Flag } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Todo {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  priority: string;
  dueDate: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface TodoItemProps {
  todo: Todo;
  onUpdate: () => void;
  onDelete: () => void;
}

export function TodoItem({ todo, onUpdate, onDelete }: TodoItemProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleToggleComplete = async () => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/todos/${todo.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          completed: !todo.completed,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update todo");
      }

      onUpdate();
    } catch (error) {
      console.error("Error updating todo:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this todo?")) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/todos/${todo.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete todo");
      }

      onDelete();
    } catch (error) {
      console.error("Error deleting todo:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const priorityColors = {
    low: "text-blue-600 dark:text-blue-400",
    medium: "text-yellow-600 dark:text-yellow-400",
    high: "text-red-600 dark:text-red-400",
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const isOverdue = todo.dueDate && !todo.completed && new Date(todo.dueDate) < new Date();

  return (
    <Card
      className={cn(
        "transition-all hover:shadow-md",
        todo.completed && "opacity-60",
        isDeleting && "opacity-30"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={todo.completed}
            onCheckedChange={handleToggleComplete}
            disabled={isUpdating || isDeleting}
            className="mt-1"
          />

          <div className="flex-1 min-w-0">
            <h3
              className={cn(
                "font-medium text-base mb-1",
                todo.completed && "line-through text-muted-foreground"
              )}
            >
              {todo.title}
            </h3>

            {todo.description && (
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                {todo.description}
              </p>
            )}

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Flag
                  className={cn(
                    "h-3 w-3",
                    priorityColors[todo.priority as keyof typeof priorityColors] ||
                      priorityColors.medium
                  )}
                />
                <span className="capitalize">{todo.priority}</span>
              </div>

              {todo.dueDate && (
                <div
                  className={cn(
                    "flex items-center gap-1",
                    isOverdue && "text-red-600 dark:text-red-400 font-medium"
                  )}
                >
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(todo.dueDate)}</span>
                  {isOverdue && <span className="ml-1">(Overdue)</span>}
                </div>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            disabled={isDeleting || isUpdating}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
