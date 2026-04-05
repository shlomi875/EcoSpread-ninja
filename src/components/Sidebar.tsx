import React from 'react';
import { LayoutDashboard, Plus, Search, Sparkles, Settings, Database, History, Languages, LogOut, PenTool, Image as ImageIcon, Users } from 'lucide-react';
import { cn } from '../lib/utils';
import { translations, Language } from '../i18n';
import { AppView } from '../types';

interface SidebarProps {
  onAddProduct: () => void;
  onSearchWeb: () => void;
  onOpenSettings: () => void;
  isSearching: boolean;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  user: any;
  onLogout: () => void;
  activeView: AppView;
  onViewChange: (view: AppView) => void;
}

export function Sidebar({ 
  onAddProduct, 
  onSearchWeb, 
  onOpenSettings, 
  isSearching, 
  language, 
  onLanguageChange, 
  user, 
  onLogout,
  activeView,
  onViewChange
}: SidebarProps) {
  const t = translations[language];
  
  const menuItems = [
    { icon: LayoutDashboard, label: t.dashboard, view: 'dashboard' as AppView },
    { icon: Database, label: t.products, view: 'products' as AppView },
    { icon: PenTool, label: t.creative, view: 'creative' as AppView },
    { icon: ImageIcon, label: t.assets, view: 'assets' as AppView },
    ...(user?.role === 'admin' ? [{ icon: Users, label: language === 'he' ? 'משתמשים' : 'Users', view: 'users' as AppView }] : []),
    { icon: Settings, label: t.settings, onClick: onOpenSettings },
  ];

  const canEdit = user?.role === 'admin' || user?.role === 'editor';

  return (
    <div className="w-72 bg-white border-r flex flex-col h-full shadow-sm">
      <div className="p-8">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">{t.appName}</h1>
          </div>
          
          <button 
            onClick={() => onLanguageChange(language === 'en' ? 'he' : 'en')}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors flex items-center gap-1"
            title={language === 'en' ? 'עברית' : 'English'}
          >
            <Languages className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase">{language === 'en' ? 'HE' : 'EN'}</span>
          </button>
        </div>

        <div className="space-y-4 mb-10">
          <button
            onClick={onAddProduct}
            disabled={!canEdit}
            className={cn(
              "w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl font-semibold shadow-md shadow-blue-100 transition-all active:scale-95",
              !canEdit && "opacity-50 cursor-not-allowed grayscale"
            )}
          >
            <Plus className="w-5 h-5" />
            {t.addProduct}
          </button>
          <button
            onClick={onSearchWeb}
            disabled={isSearching || !canEdit}
            className={cn(
              "w-full flex items-center justify-center gap-2 bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 py-3 px-4 rounded-xl font-semibold transition-all active:scale-95",
              (isSearching || !canEdit) && "opacity-50 cursor-not-allowed grayscale"
            )}
          >
            {isSearching ? (
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
            {isSearching ? t.searching : t.searchWeb}
          </button>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (item.view) onViewChange(item.view);
                if (item.onClick) item.onClick();
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                (item.view === activeView) 
                  ? "bg-blue-50 text-blue-600" 
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-8 border-t bg-gray-50/50 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 border-2 border-white shadow-sm flex items-center justify-center text-white font-bold text-xs">
              {user?.name?.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{user?.name || t.adminUser}</p>
              <p className="text-[10px] font-bold uppercase text-blue-600 tracking-wider">
                {user?.role === 'admin' ? 'Administrator' : user?.role === 'editor' ? 'Editor' : 'Viewer'}
              </p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
