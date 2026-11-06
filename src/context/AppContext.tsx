import React, { createContext, useContext, useState, useEffect } from 'react';
import { Culture, ThemeMode } from '../types';
import { translations, Translations } from '../i18n/translations';

interface Notification {
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AppContextType {
  culture: Culture;
  setCulture: (culture: Culture) => void;
  t: Translations;
  theme: ThemeMode;
  toggleTheme: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sidebarExpanded: boolean;
  setSidebarExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  notification: Notification | null;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
  clearNotification: () => void;
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [culture, setCultureState] = useState<Culture>(() => {
    const saved = localStorage.getItem('lightbase_culture');
    return (saved === 'en' || saved === 'tr-TR') ? saved : 'tr-TR';
  });

  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('lightbase_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [activeTab, setActiveTab] = useState<string>(() => {
    const hash = window.location.hash.replace('#/', '').replace('#', '');
    return hash || 'home';
  });

  const [sidebarExpanded, setSidebarExpanded] = useState<boolean>(true);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('lightbase_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('lightbase_culture', culture);
  }, [culture]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '').replace('#', '');
      setActiveTab(hash || 'home');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const setCulture = (c: Culture) => {
    setCultureState(c);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  };

  const clearNotification = () => setNotification(null);

  const triggerRefresh = () => setRefreshTrigger((prev) => prev + 1);

  const t = translations[culture];

  return (
    <AppContext.Provider
      value={{
        culture,
        setCulture,
        t,
        theme,
        toggleTheme,
        activeTab,
        setActiveTab: (tab: string) => {
          setActiveTab(tab);
          window.location.hash = tab === 'home' ? '' : tab;
        },
        sidebarExpanded,
        setSidebarExpanded,
        notification,
        showNotification,
        clearNotification,
        refreshTrigger,
        triggerRefresh,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
