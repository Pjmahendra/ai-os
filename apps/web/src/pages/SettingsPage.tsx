import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext.js";
import { users, email } from "../api/endpoints.js";
import { ApiError } from "../api/client.js";
import type { EmailAccount } from "../api/types.js";

// A representative subset — Intl.supportedValuesOf isn't available in
// every browser runtime, so this list keeps the picker useful without
// depending on it.
const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney"
];

export function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [emailAccount, setEmailAccount] = useState<EmailAccount | null>(
    null
  );
  const [emailLoading, setEmailLoading] = useState(true);
  const [emailError, setEmailError] = useState<string | null>(null);

  const gmailStatus = new URLSearchParams(window.location.search).get(
    "gmail"
  );

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setTimezone(user.timezone);
    }
  }, [user]);

  useEffect(() => {
    loadEmailAccount();
  }, []);

  async function loadEmailAccount() {
    setEmailLoading(true);
    try {
      const { account } = await email.accounts();
      setEmailAccount(account);
    } catch {
      // Non-fatal — the connect button still works either way.
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleDisconnect(id: string) {
    if (!confirm("Disconnect this Gmail account?")) {
      return;
    }

    setEmailError(null);

    try {
      await email.disconnect(id);
      setEmailAccount(null);
    } catch (err) {
      setEmailError(
        err instanceof ApiError ? err.message : "Failed to disconnect"
      );
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      await users.updateSettings({ name, timezone });
      await refreshUser();
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      <form className="card settings-form" onSubmit={handleSubmit}>
        <label>
          Email
          <input value={user?.email ?? ""} disabled />
        </label>

        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <label>
          Timezone
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          >
            {!COMMON_TIMEZONES.includes(timezone) && (
              <option value={timezone}>{timezone}</option>
            )}
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
          <span className="muted field-hint">
            Scheduled automations run according to this timezone.
          </span>
        </label>

        {error && <div className="form-error">{error}</div>}
        {saved && <div className="form-success">Saved.</div>}

        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>

      <div className="card settings-form">
        <h2 className="settings-section-title">Email assistant</h2>

        {gmailStatus === "connected" && (
          <div className="form-success">Gmail connected.</div>
        )}
        {gmailStatus === "error" && (
          <div className="form-error">
            Couldn't connect Gmail. Please try again.
          </div>
        )}
        {emailError && <div className="form-error">{emailError}</div>}

        {emailLoading ? (
          <p className="muted">Loading…</p>
        ) : emailAccount ? (
          <div className="email-account-row">
            <span>{emailAccount.email}</span>
            <button
              className="btn btn-danger"
              onClick={() => handleDisconnect(emailAccount.id)}
            >
              Disconnect
            </button>
          </div>
        ) : (
          <>
            <p className="muted">
              Connect a Gmail account to let the assistant read your inbox
              and draft replies for your review.
            </p>
            <a
              className="btn btn-primary btn-block"
              href={email.connectUrl()}
            >
              Connect Gmail
            </a>
          </>
        )}
      </div>
    </div>
  );
}
