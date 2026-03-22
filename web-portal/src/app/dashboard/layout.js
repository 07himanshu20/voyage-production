'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { getSocket } from '@/lib/socket';

export default function DashboardLayout({ children }) {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('bestclass_admin_token');
    if (!token) router.replace('/login');
  }, [router]);

  // Initialize socket connection early so all dashboard pages can use it
  useEffect(() => {
    getSocket();
  }, []);

  return (
    <div className="flex min-h-screen bg-navy-500">
      <Sidebar />
      <main className="flex-1 ml-72 p-8">{children}</main>
    </div>
  );
}
