export interface DraftResult {
  readonly subject: string;
  readonly body: string;
}

// A trimmed view of a thread, just enough context for a reply - not
// the full EmailMessage shape from apps/api, so this package stays
// independent of the API's Gmail wiring.
export interface ThreadContextMessage {
  readonly from: string;
  readonly date: string;
  readonly body: string;
}
