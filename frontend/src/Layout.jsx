import React from 'react';

/**
 * App shell layout.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - Page content rendered inside the layout.
 * @param {string} [props.currentPageName] - Current route/page key forwarded by App routing.
 */
export default function Layout({ children, currentPageName }) {
  // Reserved for future page-aware layout behavior.
  void currentPageName;

  return (
    <div className="min-h-screen bg-slate-50">
      {children}
    </div>
  );
}
