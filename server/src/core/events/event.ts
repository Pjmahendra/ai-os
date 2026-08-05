export interface Event<T = unknown> {
  type: string;
  timestamp: Date;
  payload: T;
}
