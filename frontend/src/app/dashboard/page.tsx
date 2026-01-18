'use client';

import { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { syncClerkUserToBackendClientSide } from '@/src/lib/syncUser';

// Dashboard Components
import DashboardLayout from '@/src/components/dashboard/DashboardLayout';
import ClosetGrid from '@/src/components/dashboard/ClosetGrid';
import SavedOutfits from '@/src/components/dashboard/SavedOutfits';
import OrderHistory from '@/src/components/dashboard/OrderHistory';
import WishlistSection from '@/src/components/dashboard/WishlistSection';
import StyleProfile from '@/src/components/dashboard/StyleProfile';

export default function DashboardPage() {
  const { getToken, isLoaded: authLoaded } = useAuth();
  const { isSignedIn, isLoaded: userLoaded } = useUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('closet');
  const [synced, setSynced] = useState(false);

  // Redirect if not signed in
  useEffect(() => {
    if (userLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [userLoaded, isSignedIn, router]);

  // Sync user to backend
  useEffect(() => {
    if (!authLoaded || synced) return;

    (async () => {
      const token = await getToken();
      if (token) {
        await syncClerkUserToBackendClientSide(token);
        setSynced(true);
      } else {
        console.warn("❌ Clerk token not found");
      }
    })();
  }, [authLoaded, synced, getToken]);

  // Loading state
  if (!userLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading your wardrobe...</p>
        </div>
      </div>
    );
  }

  // Render active tab content
  const renderContent = () => {
    switch (activeTab) {
      case 'closet':
        return <ClosetGrid />;
      case 'outfits':
        return <SavedOutfits />;
      case 'orders':
        return <OrderHistory />;
      case 'wishlist':
        return <WishlistSection />;
      case 'profile':
        return <StyleProfile />;
      default:
        return <ClosetGrid />;
    }
  };

  return (
    <DashboardLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {renderContent()}
    </DashboardLayout>
  );
}
