import { FormEvent, useEffect, useState } from "react";
import { memories as memoriesApi } from "../api/endpoints.js";
import { ApiError } from "../api/client.js";
import type { Memory } from "../api/types.js";

export function MemoryPage() {
  const [items, setItems] = useState<Memory[]>([]);
  const [query, setQuery] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  async function load(searchQuery?: string) {
    setLoading(true);
    setError(null);

    try {
      const { memories: list } = await memoriesApi.list(searchQuery);
      setItems(list);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load memories"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    load(query || undefined);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();

    const text = content.trim();
    if (!text) return;

    try {
      await memoriesApi.create(text);
      setContent("");
      load(query || undefined);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save");
    }
  }

  async function handleDelete(memory: Memory) {
    if (!confirm("Forget this memory?")) return;

    try {
      await memoriesApi.delete(memory.id);
      setItems((prev) => prev.filter((m) => m.id !== memory.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed");
    }
  }

  function startEdit(memory: Memory) {
    setEditingId(memory.id);
    setEditingContent(memory.content);
  }

  async function saveEdit(memory: Memory) {
    try {
      const updated = await memoriesApi.update(memory.id, {
        content: editingContent
      });
      setItems((prev) =>
        prev.map((m) => (m.id === memory.id ? updated.memory : m))
      );
      setEditingId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Update failed");
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Memory</h1>
      </div>

      <form className="card" onSubmit={handleCreate}>
        <label>
          Remember something new
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="e.g. I prefer notifications in the evening"
          />
        </label>
        <button className="btn btn-primary" type="submit">
          Save memory
        </button>
      </form>

      <form className="search-row" onSubmit={handleSearch}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search memories…"
        />
        <button className="btn btn-ghost" type="submit">
          Search
        </button>
        {query && (
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => {
              setQuery("");
              load();
            }}
          >
            Clear
          </button>
        )}
      </form>

      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="muted">Nothing saved yet.</p>
      ) : (
        <div className="memory-list">
          {items.map((memory) => (
            <div key={memory.id} className="memory-card">
              {editingId === memory.id ? (
                <div className="memory-edit-row">
                  <input
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={() => saveEdit(memory)}
                  >
                    Save
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <div className="memory-content">{memory.content}</div>
                  <div className="memory-actions">
                    <span className="muted">
                      {new Date(memory.createdAt).toLocaleDateString()}
                    </span>
                    <button
                      className="btn btn-ghost"
                      onClick={() => startEdit(memory)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDelete(memory)}
                    >
                      Forget
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
