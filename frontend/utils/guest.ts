export function getOrCreateGuestId(): string {
  if (typeof window === "undefined") return "";
  const KEY = "cove_guest_session_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = (crypto?.randomUUID?.() || `guest_${Math.random().toString(36).slice(2)}-${Date.now()}`);
    if (!id.startsWith("guest_")) id = `guest_${id}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}
