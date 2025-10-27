

export async function syncClerkUserToBackendClientSide(token: string) {
  if (!token || token === "undefined") {
    console.warn("❌ No valid token passed to syncClerkUserToBackendClientSide");
    return;
  }

  try {
    const res = await fetch('http://localhost:8000/api/sync-user/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!res.ok) throw new Error('Sync failed');
    const data = await res.json();
    console.log('✅ Synced user:', data);
  } catch (err) {
    console.error('❌ Sync error:', err);
  }
}
