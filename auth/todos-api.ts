import { api, APIError } from "encore.dev/api";
import { eq, and, desc, asc } from "drizzle-orm";
import { db } from "./db";
import { todos } from "./schema";
import { auth } from "./better-auth";

// Helper function to verify authentication and get user ID
async function getUserId(headers: Headers): Promise<string> {
  const cookieHeader = headers.get("cookie");
  if (!cookieHeader) {
    throw APIError.unauthenticated("Not authenticated");
  }

  const session = await auth.api.getSession({ headers: { cookie: cookieHeader } });
  if (!session?.user?.id) {
    throw APIError.unauthenticated("Not authenticated");
  }

  return session.user.id;
}

// Generate a unique ID for todos
function generateId(): string {
  return `todo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Request/Response types
export interface CreateTodoRequest {
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high";
  dueDate?: string; // ISO string
}

export interface UpdateTodoRequest {
  title?: string;
  description?: string;
  completed?: boolean;
  priority?: "low" | "medium" | "high";
  dueDate?: string | null; // ISO string or null to clear
}

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

export interface ListTodosRequest {
  completed?: boolean;
  priority?: "low" | "medium" | "high";
  sortBy?: "createdAt" | "dueDate" | "priority";
  sortOrder?: "asc" | "desc";
}

export interface ListTodosResponse {
  todos: Todo[];
}

// API Endpoints

// Create a new todo
export const createTodo = api(
  { expose: true, method: "POST", path: "/todos" },
  async (req: CreateTodoRequest, headers: Headers): Promise<Todo> => {
    const userId = await getUserId(headers);

    const newTodo = {
      id: generateId(),
      title: req.title,
      description: req.description || null,
      completed: false,
      priority: req.priority || "medium",
      dueDate: req.dueDate ? new Date(req.dueDate) : null,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(todos).values(newTodo);

    return {
      ...newTodo,
      dueDate: newTodo.dueDate?.toISOString() || null,
      createdAt: newTodo.createdAt.toISOString(),
      updatedAt: newTodo.updatedAt.toISOString(),
    };
  }
);

// List todos with optional filters
export const listTodos = api(
  { expose: true, method: "GET", path: "/todos" },
  async (req: ListTodosRequest, headers: Headers): Promise<ListTodosResponse> => {
    const userId = await getUserId(headers);

    // Build filter conditions
    const conditions = [eq(todos.userId, userId)];
    if (req.completed !== undefined) {
      conditions.push(eq(todos.completed, req.completed));
    }
    if (req.priority) {
      conditions.push(eq(todos.priority, req.priority));
    }

    // Build sort order
    let orderBy;
    const sortOrder = req.sortOrder === "asc" ? asc : desc;
    switch (req.sortBy) {
      case "dueDate":
        orderBy = sortOrder(todos.dueDate);
        break;
      case "priority":
        orderBy = sortOrder(todos.priority);
        break;
      default:
        orderBy = sortOrder(todos.createdAt);
    }

    const result = await db
      .select()
      .from(todos)
      .where(and(...conditions))
      .orderBy(orderBy);

    return {
      todos: result.map((todo) => ({
        ...todo,
        dueDate: todo.dueDate?.toISOString() || null,
        createdAt: todo.createdAt.toISOString(),
        updatedAt: todo.updatedAt.toISOString(),
      })),
    };
  }
);

// Get a single todo by ID
export const getTodo = api(
  { expose: true, method: "GET", path: "/todos/:id" },
  async ({ id }: { id: string }, headers: Headers): Promise<Todo> => {
    const userId = await getUserId(headers);

    const result = await db
      .select()
      .from(todos)
      .where(and(eq(todos.id, id), eq(todos.userId, userId)))
      .limit(1);

    if (result.length === 0) {
      throw APIError.notFound("Todo not found");
    }

    const todo = result[0];
    return {
      ...todo,
      dueDate: todo.dueDate?.toISOString() || null,
      createdAt: todo.createdAt.toISOString(),
      updatedAt: todo.updatedAt.toISOString(),
    };
  }
);

// Update a todo
export const updateTodo = api(
  { expose: true, method: "PATCH", path: "/todos/:id" },
  async (
    { id, ...req }: UpdateTodoRequest & { id: string },
    headers: Headers
  ): Promise<Todo> => {
    const userId = await getUserId(headers);

    // Verify todo exists and belongs to user
    const existing = await db
      .select()
      .from(todos)
      .where(and(eq(todos.id, id), eq(todos.userId, userId)))
      .limit(1);

    if (existing.length === 0) {
      throw APIError.notFound("Todo not found");
    }

    // Build update object
    const updates: any = { updatedAt: new Date() };
    if (req.title !== undefined) updates.title = req.title;
    if (req.description !== undefined) updates.description = req.description;
    if (req.completed !== undefined) updates.completed = req.completed;
    if (req.priority !== undefined) updates.priority = req.priority;
    if (req.dueDate !== undefined) {
      updates.dueDate = req.dueDate ? new Date(req.dueDate) : null;
    }

    await db.update(todos).set(updates).where(eq(todos.id, id));

    // Fetch updated todo
    const result = await db
      .select()
      .from(todos)
      .where(eq(todos.id, id))
      .limit(1);

    const todo = result[0];
    return {
      ...todo,
      dueDate: todo.dueDate?.toISOString() || null,
      createdAt: todo.createdAt.toISOString(),
      updatedAt: todo.updatedAt.toISOString(),
    };
  }
);

// Delete a todo
export const deleteTodo = api(
  { expose: true, method: "DELETE", path: "/todos/:id" },
  async ({ id }: { id: string }, headers: Headers): Promise<{ success: boolean }> => {
    const userId = await getUserId(headers);

    const result = await db
      .delete(todos)
      .where(and(eq(todos.id, id), eq(todos.userId, userId)));

    return { success: true };
  }
);
