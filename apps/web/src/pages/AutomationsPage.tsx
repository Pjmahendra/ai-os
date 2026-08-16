import { FormEvent, useEffect, useState } from "react";
import { automations as automationsApi } from "../api/endpoints.js";
import { ApiError } from "../api/client.js";
import type { Automation, AutomationExecution } from "../api/types.js";

export function AutomationsPage() {
  const [items, setItems] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [executions, setExecutions] = useState<AutomationExecution[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const { automations: list } = await automationsApi.list();
      setItems(list);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load automations"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleToggle(automation: Automation) {
    try {
      await automationsApi.toggle(automation.id, !automation.enabled);
      setItems((prev) =>
        prev.map((a) =>
          a.id === automation.id ? { ...a, enabled: !a.enabled } : a
        )
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Toggle failed");
    }
  }

  async function handleDelete(automation: Automation) {
    if (!confirm(`Delete "${automation.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      await automationsApi.delete(automation.id);
      setItems((prev) => prev.filter((a) => a.id !== automation.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed");
    }
  }

  async function handleExecute(automation: Automation) {
    setError(null);

    try {
      await automationsApi.execute(automation.id);
      if (expandedId === automation.id) {
        loadExecutions(automation.id);
      }
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Execution failed");
    }
  }

  async function loadExecutions(id: string) {
    try {
      const { executions: list } = await automationsApi.executions(id);
      setExecutions(list);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load history"
      );
    }
  }

  async function toggleExpand(automation: Automation) {
    if (expandedId === automation.id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(automation.id);
    loadExecutions(automation.id);
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Automations</h1>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateForm((v) => !v)}
        >
          {showCreateForm ? "Cancel" : "+ New automation"}
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      {showCreateForm && (
        <CreateAutomationForm
          onCreated={() => {
            setShowCreateForm(false);
            load();
          }}
          onError={setError}
        />
      )}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="muted">
          No automations yet. Create one here, or ask AI-OS in Chat.
        </p>
      ) : (
        <div className="automation-list">
          {items.map((automation) => (
            <div key={automation.id} className="automation-card">
              <div className="automation-card-header">
                <div>
                  <div className="automation-name">{automation.name}</div>
                  <div className="muted">
                    {automation.workflow}
                    {automation.schedule
                      ? ` · cron: ${automation.schedule}`
                      : " · manual"}
                  </div>
                </div>

                <div className="automation-actions">
                  <span
                    className={
                      automation.enabled
                        ? "badge badge-success"
                        : "badge badge-muted"
                    }
                  >
                    {automation.enabled ? "Enabled" : "Disabled"}
                  </span>
                  <button
                    className="btn btn-ghost"
                    onClick={() => handleExecute(automation)}
                  >
                    Run
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => handleToggle(automation)}
                  >
                    {automation.enabled ? "Disable" : "Enable"}
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => toggleExpand(automation)}
                  >
                    History
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDelete(automation)}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {expandedId === automation.id && (
                <div className="execution-history">
                  {executions.length === 0 ? (
                    <p className="muted">No executions yet.</p>
                  ) : (
                    <table className="execution-table">
                      <thead>
                        <tr>
                          <th>Status</th>
                          <th>Started</th>
                          <th>Detail</th>
                        </tr>
                      </thead>
                      <tbody>
                        {executions.map((exec) => (
                          <tr key={exec.id}>
                            <td>
                              <span
                                className={`badge badge-${
                                  exec.status === "success"
                                    ? "success"
                                    : exec.status === "failed"
                                      ? "danger"
                                      : "muted"
                                }`}
                              >
                                {exec.status}
                              </span>
                            </td>
                            <td>
                              {new Date(exec.startedAt).toLocaleString()}
                            </td>
                            <td className="execution-detail">
                              {exec.error ??
                                JSON.stringify(exec.result ?? {})}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateAutomationForm({
  onCreated,
  onError
}: {
  onCreated: () => void;
  onError: (message: string) => void;
}) {
  const [name, setName] = useState("");
  const [workflow, setWorkflow] = useState("ai-os-notification");
  const [message, setMessage] = useState("");
  const [schedule, setSchedule] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      await automationsApi.create({
        name,
        workflow,
        config: message ? { message } : {},
        ...(schedule
          ? { scheduleType: "cron", schedule }
          : {})
      });

      onCreated();
    } catch (err) {
      onError(
        err instanceof ApiError ? err.message : "Failed to create automation"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card create-automation-form" onSubmit={handleSubmit}>
      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>

      <label>
        Workflow
        <select
          value={workflow}
          onChange={(e) => setWorkflow(e.target.value)}
        >
          <option value="ai-os-notification">ai-os-notification</option>
          <option value="ai-os-test">ai-os-test</option>
        </select>
      </label>

      <label>
        Message (for notification workflows)
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Optional"
        />
      </label>

      <label>
        Cron schedule (optional, 5-field)
        <input
          value={schedule}
          onChange={(e) => setSchedule(e.target.value)}
          placeholder="e.g. 0 9 * * *"
        />
      </label>

      <button className="btn btn-primary" type="submit" disabled={submitting}>
        {submitting ? "Creating…" : "Create automation"}
      </button>
    </form>
  );
}
