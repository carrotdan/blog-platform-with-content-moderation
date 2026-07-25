"use client";

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import { useAuth } from '../hooks/useAuth';
import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function NavbarWrapper({ children }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');
  const { isAuthenticated, user } = useAuth();

  if (isAdmin) {
    // Admin: render children directly, no navbar, no container
    return <>{children}</>;
  }

  // Blog pages: render navbar + warning banner + constrained container
  return (
    <>
      <Navbar />
      {isAuthenticated && user && user.status === 'WARNING' && (
        <div className="bg-amber-50 border-y border-amber-200/60 px-4 py-3 sm:px-6 lg:px-8 text-amber-700 text-sm font-medium transition-all shadow-sm">
          <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <ShieldAlert className="h-4 w-4" />
              </span>
              <span className="leading-snug">
                <strong>Cảnh báo tài khoản:</strong> Bạn đang có <strong className="text-amber-900 font-extrabold">{user.violationScore || 0}/10</strong> điểm vi phạm. Tài khoản sẽ bị khóa vĩnh viễn nếu đạt 10 điểm. Vui lòng kiểm duyệt kỹ nội dung đăng tải.
              </span>
            </div>
            <Link href="/appeals" className="shrink-0 text-amber-800 hover:text-amber-950 font-bold underline decoration-2 underline-offset-4 text-xs">
              Xem kháng cáo ngay →
            </Link>
          </div>
        </div>
      )}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </>
  );
}
