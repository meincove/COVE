'use client';

import { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { syncClerkUserToBackendClientSide } from '@/lib/syncUser';

// Dashboard Components
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ClosetGrid from '@/components/dashboard/ClosetGrid';
import SavedOutfits from '@/components/dashboard/SavedOutfits';
import OrderHistory from '@/components/dashboard/OrderHistory';
import WishlistSection from '@/components/dashboard/WishlistSection';
import StyleProfile from '@/components/dashboard/StyleProfile';
import BuyerDashboardOverview from '@/components/dashboard/BuyerDashboardOverview';

export default function DashboardPage() {
  const { getToken, isLoaded: authLoaded } = useAuth();
  const { isSignedIn, isLoaded: userLoaded, user } = useUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
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
      case 'overview':
        return <BuyerDashboardOverview user={user} />;
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
        return <BuyerDashboardOverview user={user} />;
    }
  };

  return (
    <DashboardLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      user={user}
    >
      {renderContent()}
    </DashboardLayout>
  );
}
