import React, { useState, useEffect } from 'react';
import { apiClient } from '@/api/client';
import { fetchMe, updateMe } from '@/api/auth';
import { Loader2, Save, User as UserIcon, Mail, Phone, ArrowLeft, Lock } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { formatDateTimeLocal } from '@/lib/dateTime';
import { TOAST_MESSAGES } from '@/lib/toastMessages';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import PageSection from '@/components/layout/PageSection';

/** @typedef {import('@/types/user').CanonicalUserProfile} CanonicalUserProfile */

export default function Profile() {
  /** @type {[CanonicalUserProfile | null, import('react').Dispatch<import('react').SetStateAction<CanonicalUserProfile | null>>]} */
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState({
    full_name: '',
    email: '',
    phone: ''
  });
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMe().then(u => {
      setUser(u);
      setUserData({
        full_name: u?.name || '',
        email: u?.email || '',
        phone: u.phone || ''
      });
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateMe({ 
        name: userData.full_name,
        phone: userData.phone 
      });
      setUser({ ...user, name: userData.full_name, phone: userData.phone });
      toast.success(TOAST_MESSAGES.profile.updateSuccess);
    } catch {
      toast.error(TOAST_MESSAGES.profile.updateError);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.new !== passwordData.confirm) {
      toast.error(TOAST_MESSAGES.profile.passwordsDoNotMatch);
      return;
    }
    if (passwordData.new.length < 8) {
      toast.error(TOAST_MESSAGES.profile.passwordMinLength);
      return;
    }
    
    setSavingPassword(true);
    try {
      await apiClient.put('/protected/auth/change-password', {
        current_password: passwordData.current,
        new_password: passwordData.new,
        new_password_confirmation: passwordData.confirm
      });
      toast.success(TOAST_MESSAGES.profile.passwordChangeSuccess);
      setPasswordData({ current: '', new: '', confirm: '' });
    } catch {
      toast.error(TOAST_MESSAGES.profile.passwordChangeError);
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <PageContainer>
      <Link
        to={createPageUrl('POS')}
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to POS
      </Link>

      <PageHeader
        title="Mi Perfil"
        description="Actualizá los datos de tu cuenta en el sistema"
      />

      <PageSection className="space-y-6">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="w-5 h-5" />
                Información personal
              </CardTitle>
              {/* <CardDescription>Modificá los detalles de tu cuenta</CardDescription> */}
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={userData.full_name}
                  onChange={(e) => setUserData({ ...userData, full_name: e.target.value })}
                  placeholder="Enter your full name"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  value={userData.email}
                  disabled
                  className="mt-1.5 bg-slate-50"
                />
                <p className="text-xs text-slate-500 mt-1.5">Email cannot be changed</p>
              </div>
              <div>
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Teléfono
                </Label>
                <Input
                  id="phone"
                  value={userData.phone}
                  onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                  placeholder="Enter your phone number"
                  className="mt-1.5"
                />
              </div>
              <Button onClick={handleSave} disabled={saving || !userData.full_name}>
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Guardar cambios
              </Button>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Cambio de contraseña
              </CardTitle>
              {/* <CardDescription>Update your account password</CardDescription> */}
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="current_password">Contraseña actual</Label>
                <Input
                  id="current_password"
                  type="password"
                  value={passwordData.current}
                  onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                  placeholder="Ingresá tu contraseña actual"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="new_password">Nueva contraseña</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={passwordData.new}
                  onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                  placeholder="Ingresá tu nueva contraseña"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="confirm_password">Confirmar nueva contraseña</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={passwordData.confirm}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                  placeholder="Confirmá la nueva contraseña"
                  className="mt-1.5"
                />
              </div>
              <Button 
                onClick={handleChangePassword} 
                disabled={savingPassword || !passwordData.current || !passwordData.new || !passwordData.confirm}
                variant="outline"
              >
                {savingPassword ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4 mr-2" />
                )}
                Cambiar contraseña
              </Button>
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle>Información de la cuenta</CardTitle>
              {/* <CardDescription>View your account details</CardDescription> */}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">Fecha de registro</span>
                <span className="text-sm font-medium text-slate-900">
                  {user?.created_at ? formatDateTimeLocal(user.created_at, { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}
                </span>
              </div>
              {typeof user?.id === 'number' && (
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-600">User ID</span>
                  <span className="text-sm font-mono text-slate-900">{user.id}</span>
                </div>
              )}
            </CardContent>
          </Card>
      </PageSection>
    </PageContainer>
  );
}
