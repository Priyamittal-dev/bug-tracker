"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProject } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, FolderPlus } from "lucide-react";

export function CreateProjectDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const router = useRouter();

  function handleNameChange(val: string) {
    setName(val);
    if (!key || key.length <= 4) {
      const generated = val
        .replace(/[^a-zA-Z]/g, "")
        .slice(0, 4)
        .toUpperCase();
      setKey(generated);
    }
  }

  async function onSubmit(formData: FormData) {
    setLoading(true);
    try {
      await createProject(formData);
      setOpen(false);
      setName("");
      setKey("");
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
          >
            <Plus className="h-4 w-4" />
            Create Project
          </Button>
        }
      >
        Create Project
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FolderPlus className="h-5 w-5 text-primary" />
            Create Project Workspace
          </DialogTitle>
        </DialogHeader>

        <form action={onSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-semibold">
              Project Name
            </Label>
            <Input
              id="name"
              name="name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              placeholder="e.g. NextGen Web Portal"
              className="h-8 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="key" className="text-xs font-semibold">
                Project Key{" "}
                <span className="text-muted-foreground text-[10px]">
                  (Prefix)
                </span>
              </Label>
              <Input
                id="key"
                name="key"
                value={key}
                onChange={(e) => setKey(e.target.value.toUpperCase())}
                required
                maxLength={6}
                placeholder="e.g. WEB"
                className="font-mono h-8 text-xs uppercase"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category" className="text-xs font-semibold">
                Category
              </Label>
              <select
                id="category"
                name="category"
                className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs focus:ring-1 focus:ring-primary"
              >
                <option value="Web Application">Web Application</option>
                <option value="Mobile App">Mobile App</option>
                <option value="Cloud Infrastructure">
                  Cloud Infrastructure
                </option>
                <option value="Fintech & Payments">Fintech & Payments</option>
                <option value="E-Commerce">E-Commerce</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-semibold">
              Description
            </Label>
            <textarea
              id="description"
              name="description"
              rows={3}
              placeholder="Summary of this project scope, tech stack, and objectives..."
              className="w-full rounded-md border border-input bg-background p-2 text-xs focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
