import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Edit2, X, Check, Shield, Eye, PenTool } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppUser } from '../types';
import { Language } from '../i18n';
import { cn } from '../lib/utils';

interface UsersManagerProps {
  language: Language;
}

const ROLE_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  admin:  { label: 'Administrator', icon: Shield,  color: 'text-red-600 bg-red-50 border-red-100' },
  editor: { label: 'Editor',        icon: PenTool, color: 'text-blue-600 bg-blue-50 border-blue-100' },
  viewer: { label: 'Viewer',        icon: Eye,     color: 'text-gray-600 bg-gray-50 border-gray-200' },
};

const EMPTY_FORM = { name: '', email: '', password: '', role: 'viewer' as AppUser['role'] };

export function UsersManager({ language }: UsersManagerProps) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isRTL = language === 'he';

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const r = await fetch('/api/users');
      if (r.ok) setUsers(await r.json());
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowForm(true);
  };

  const openEdit = (u: AppUser) => {
    setEditingId(u.id);
    setForm({ name: u.name, email: u.email, password: '', role: u.role });
    setError('');
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) { setError(isRTL ? 'שם ואימייל הם שדות חובה' : 'Name and email are required'); return; }
    if (!editingId && !form.password) { setError(isRTL ? 'סיסמה נדרשת למשתמש חדש' : 'Password required for new user'); return; }
    setSaving(true);
    setError('');
    try {
      const body: any = { name: form.name, email: form.email, role: form.role };
      if (form.password) body.password = form.password;
      const r = await fetch(editingId ? `/api/users/${editingId}` : '/api/users', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || 'Save failed'); }
      const saved = await r.json();
      setUsers(prev => editingId ? prev.map(u => u.id === editingId ? { ...u, ...saved } : u) : [...prev, saved]);
      setShowForm(false);
    } catch (e: any) {
      setError(e.message);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(isRTL ? `למחוק את ${name}?` : `Delete ${name}?`)) return;
    const r = await fetch(`/api/users/${id}`, { method: 'DELETE' });
    if (r.ok) setUsers(prev => prev.filter(u => u.id !== id));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <header className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 text-blue-600 font-bold tracking-widest text-xs uppercase mb-2">
            <Users className="w-4 h-4" />
            {isRTL ? 'ניהול משתמשים' : 'User Management'}
          </div>
          <h1 className="text-4xl font-black tracking-tight text-gray-900">
            {isRTL ? 'משתמשים' : 'Users'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isRTL ? 'צור ונהל משתמשים ורמות הרשאה' : 'Create and manage users and permission levels'}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-blue-100"
        >
          <Plus className="w-5 h-5" />
          {isRTL ? 'משתמש חדש' : 'New User'}
        </button>
      </header>

      {/* User list */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-20 text-center text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">{isRTL ? 'אין משתמשים' : 'No users yet'}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b bg-gray-50/50">
              <tr className="text-xs font-bold uppercase tracking-widest text-gray-400">
                <th className="px-8 py-4 text-start">{isRTL ? 'משתמש' : 'User'}</th>
                <th className="px-8 py-4 text-start">{isRTL ? 'אימייל' : 'Email'}</th>
                <th className="px-8 py-4 text-start">{isRTL ? 'תפקיד' : 'Role'}</th>
                <th className="px-8 py-4 text-start">{isRTL ? 'נוצר' : 'Created'}</th>
                <th className="px-8 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <AnimatePresence>
                {users.map(u => {
                  const roleInfo = ROLE_LABELS[u.role] || ROLE_LABELS.viewer;
                  const RoleIcon = roleInfo.icon;
                  return (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-gray-900">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-sm text-gray-500">{u.email}</td>
                      <td className="px-8 py-4">
                        <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border', roleInfo.color)}>
                          <RoleIcon className="w-3 h-3" />
                          {roleInfo.label}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-sm text-gray-400">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('he-IL') : '—'}
                      </td>
                      <td className="px-8 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(u)} className="p-2 hover:bg-blue-50 text-blue-600 rounded-xl transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(u.id, u.name)} className="p-2 hover:bg-red-50 text-red-500 rounded-xl transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b flex items-center justify-between">
                <h2 className="text-2xl font-black text-gray-900">
                  {editingId ? (isRTL ? 'ערוך משתמש' : 'Edit User') : (isRTL ? 'משתמש חדש' : 'New User')}
                </h2>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-xl">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-8 space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">{isRTL ? 'שם מלא' : 'Full Name'}</label>
                  <input
                    type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 font-medium"
                    placeholder={isRTL ? 'ישראל ישראלי' : 'John Doe'}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">{isRTL ? 'אימייל' : 'Email'}</label>
                  <input
                    type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 font-medium"
                    placeholder="user@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">
                    {isRTL ? 'סיסמה' : 'Password'}
                    {editingId && <span className="text-gray-400 font-normal mr-2 ml-2">({isRTL ? 'השאר ריק לאי-שינוי' : 'leave blank to keep'})</span>}
                  </label>
                  <input
                    type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 font-medium"
                    placeholder="••••••••"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">{isRTL ? 'תפקיד' : 'Role'}</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['admin', 'editor', 'viewer'] as AppUser['role'][]).map(role => {
                      const info = ROLE_LABELS[role];
                      const Icon = info.icon;
                      return (
                        <button
                          key={role} type="button"
                          onClick={() => setForm(f => ({ ...f, role }))}
                          className={cn(
                            'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-xs font-bold',
                            form.role === role ? info.color + ' border-current' : 'border-gray-100 text-gray-400 hover:border-gray-200'
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          {info.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)}
                    className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-all">
                    {isRTL ? 'ביטול' : 'Cancel'}
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                    {isRTL ? 'שמור' : 'Save'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
