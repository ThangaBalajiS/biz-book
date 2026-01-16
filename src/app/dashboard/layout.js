'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useTheme } from '@/components/ThemeProvider';
import styles from './layout.module.css';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/dashboard/bank', label: 'Bank Statement', icon: '🏦' },
  { href: '/dashboard/aachi-masala', label: 'Aachi Masala', icon: '🌶️' },
  { href: '/dashboard/purchases', label: 'Purchases', icon: '🛒' },
  { href: '/dashboard/outstanding', label: 'Outstanding', icon: '💰' },
  { href: '/dashboard/settings', label: 'Settings', icon: '⚙️' },
];

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Redirect to login if unauthenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Close sidebar when route changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className={styles.loadingContainer}>
        <div className="spinner"></div>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  const handleNavClick = () => {
    setSidebarOpen(false);
  };

  return (
    <div className={styles.layout}>
      {/* Mobile Header */}
      <header className={styles.mobileHeader}>
        <button 
          className={styles.hamburger}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle menu"
        >
          <span className={styles.hamburgerLine}></span>
          <span className={styles.hamburgerLine}></span>
          <span className={styles.hamburgerLine}></span>
        </button>
        <div className={styles.mobileLogoText}>📒 Biz Book</div>
      </header>

      {/* Overlay */}
      {sidebarOpen && (
        <div 
          className={styles.overlay} 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''}`}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>📒</span>
          <span className={styles.logoText}>Biz Book</span>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${pathname === item.href ? styles.active : ''}`}
              onClick={handleNavClick}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <button onClick={toggleTheme} className={styles.themeToggle}>
            {theme === 'dark' ? '☀️' : '🌙'} {theme === 'dark' ? 'Light' : 'Dark'} Mode
          </button>

          <div className={styles.userInfo}>
            <span className={styles.userName}>{session?.user?.name || 'User'}</span>
            <button onClick={handleSignOut} className={styles.signOut}>
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}
