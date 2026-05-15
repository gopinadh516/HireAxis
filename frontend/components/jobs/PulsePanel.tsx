"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { SendIcon, ActivityIcon } from "lucide-react";
import { toast } from "sonner";
import type { JobNote, MentionUser } from "@/lib/database.types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

// Highlight @word tokens in a note
function renderContent(content: string) {
  const parts = content.split(/(@\w+)/g);
  return parts.map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="inline-flex items-center rounded bg-primary/10 px-1 text-primary font-medium">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

// Detect if cursor is inside an @mention being typed
function detectMention(text: string, cursorPos: number): { query: string; start: number } | null {
  const before = text.slice(0, cursorPos);
  const match = before.match(/@(\w*)$/);
  if (!match) return null;
  return { query: match[1], start: cursorPos - match[0].length };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface PulsePanelProps {
  jobId: string;
}

export function PulsePanel({ jobId }: PulsePanelProps) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<JobNote[]>([]);
  const [allUsers, setAllUsers] = useState<MentionUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [mentionedIds, setMentionedIds] = useState<Set<string>>(new Set());
  const [mention, setMention] = useState<{ query: string; start: number; cursorPos: number } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  const fetchNotes = useCallback(async () => {
    const { data } = await supabase
      .from("job_notes")
      .select("*, users(id,name)")
      .eq("job_id", jobId)
      .order("created_at", { ascending: true });
    if (data) setNotes(data as JobNote[]);
  }, [jobId]);

  useEffect(() => {
    fetchNotes().finally(() => setLoading(false));
    apiFetch<MentionUser[]>("/api/pulse/users").then(setAllUsers).catch(() => {});

    const channel = supabase
      .channel(`pulse-${jobId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "job_notes",
        filter: `job_id=eq.${jobId}`,
      }, () => fetchNotes())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [jobId, fetchNotes]);

  // Auto-scroll feed to bottom on new notes
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [notes]);

  // Filtered user list for the current @mention query
  const filteredUsers = mention
    ? allUsers.filter(
        (u) =>
          u.id !== user?.id &&
          u.name.toLowerCase().startsWith(mention.query.toLowerCase())
      ).slice(0, 6)
    : [];

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    const cursor = e.target.selectionStart ?? val.length;
    setContent(val);
    const detected = detectMention(val, cursor);
    if (detected) {
      setMention({ ...detected, cursorPos: cursor });
    } else {
      setMention(null);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape") { setMention(null); return; }
    if (e.key === "Enter" && !e.shiftKey && !mention) {
      e.preventDefault();
      handlePost();
    }
  }

  function selectUser(selected: MentionUser) {
    if (!mention) return;
    const firstName = selected.name.split(" ")[0];
    const before = content.slice(0, mention.start);
    const after = content.slice(mention.cursorPos);
    setContent(`${before}@${firstName} ${after}`);
    setMentionedIds((prev) => new Set([...prev, selected.id]));
    setMention(null);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  async function handlePost() {
    if (!content.trim() || !user) return;
    setPosting(true);
    try {
      await apiFetch(`/api/pulse/${jobId}/notes`, {
        method: "POST",
        body: JSON.stringify({
          user_id: user.id,
          content: content.trim(),
          mentions: [...mentionedIds],
        }),
      });
      setContent("");
      setMentionedIds(new Set());
      setMention(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to post note");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden" style={{ minHeight: "360px", maxHeight: "520px" }}>
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3 shrink-0">
        <ActivityIcon className="size-4 text-primary" />
        <p className="text-sm font-semibold">Pulse</p>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {notes.length} note{notes.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Feed */}
      <div ref={feedRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : notes.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-8">
            <ActivityIcon className="size-8 text-muted-foreground/20" />
            <p className="mt-3 text-sm text-muted-foreground">No notes yet</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Post a note below · use @ to mention someone
            </p>
          </div>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="flex gap-2.5">
              {/* Avatar */}
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                {note.users?.name ? initials(note.users.name) : "?"}
              </div>
              {/* Body */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-foreground">{note.users?.name ?? "Unknown"}</span>
                  <span className="text-[10px] text-muted-foreground">{timeAgo(note.created_at)}</span>
                </div>
                <p className="mt-0.5 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                  {renderContent(note.content)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Composer */}
      <div className="relative border-t border-border px-3 py-2.5 shrink-0">
        {/* @mention dropdown */}
        {mention && filteredUsers.length > 0 && (
          <div className="absolute bottom-full left-3 right-3 mb-1.5 overflow-hidden rounded-lg border border-border bg-popover shadow-md z-20">
            <div className="px-2.5 py-1.5 border-b border-border">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Mention a person
              </p>
            </div>
            {filteredUsers.map((u) => (
              <button
                key={u.id}
                type="button"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-accent transition-colors"
                onMouseDown={(e) => { e.preventDefault(); selectUser(u); }}
              >
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                  {initials(u.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{u.name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{u.role.replace("_", " ")}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Add a note… type @ to mention someone"
            className="min-h-[36px] max-h-32 resize-none text-xs flex-1 py-2"
            rows={1}
          />
          <Button
            size="sm"
            className="h-9 px-3 shrink-0 gap-1.5"
            onClick={handlePost}
            disabled={posting || !content.trim()}
          >
            <SendIcon className="size-3.5" />
            {posting ? "Posting…" : "Post"}
          </Button>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground/60">
          Enter to post · Shift+Enter for new line · @ to mention
        </p>
      </div>
    </div>
  );
}
