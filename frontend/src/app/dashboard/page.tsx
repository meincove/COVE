// 'use client'

// import { useEffect } from 'react'
// import { syncClerkUserToBackend } from '@/src/lib/syncUser'

// export default function DashboardPage() {
//   useEffect(() => {
//     syncClerkUserToBackend()
//   }, [])

//   return (
//     <div className="text-center mt-20 text-xl">
//       Welcome to your Dashboard! 🎉
//     </div>
//   )
// }

'use client'

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { syncClerkUserToBackendClientSide } from '@/src/lib/syncUser';

export default function DashboardPage() {
  const { getToken } = useAuth();

  useEffect(() => {
    (async () => {
      const token = await getToken(); // 👈 this returns the session token
      if (token) {
        await syncClerkUserToBackendClientSide(token);
      } else {
        console.warn("❌ Clerk token not found");
      }
    })();
  }, []);

  return (
    <div>
      <h1>Welcome to Dashboard</h1>
    </div>
  );
}
