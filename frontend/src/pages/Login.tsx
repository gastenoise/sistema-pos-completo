import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2, Lock, Mail, Key } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import AppStatusBar from '@/components/layout/AppStatusBar';

const getRedirectTarget = (search) => {
  const params = new URLSearchParams(search);
  const redirectParam = params.get('redirect');
  if (
    redirectParam
    && redirectParam.startsWith('/')
    && !redirectParam.toLowerCase().startsWith('/login')
  ) {
    return redirectParam;
  }
  return createPageUrl('Home');
};

const getSessionMessage = (search) => {
  const params = new URLSearchParams(search);
  const reason = params.get('reason');

  switch (reason) {
    case 'api_unreachable':
      return 'No pudimos validar tu sesión porque el sistema no responde, iniciá sesión nuevamente.';
    case 'session_expired':
      return 'Tu sesión expiró, iniciá sesión nuevamente para continuar.';
    default:
      return '';
  }
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const sessionMessage = getSessionMessage(location.search);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(form.email, form.password);
      const target = getRedirectTarget(location.search);
      navigate(target, { replace: true });
    } catch (err) {
      if (err?.status === 403 && err?.data?.code === 'auth.ip_not_allowed') {
        setError('Tu cuenta tiene una restricción de IP. Ingresá desde la red autorizada o actualizá la configuración de seguridad.');
        return;
      }
      setError(err?.message || 'No pudimos iniciar sesión. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex items-center justify-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white">
              <Lock className="h-6 w-6" />
            </div>
              <img src="/logo.svg" alt="OpenVenta logo" className="w-12 h-12" />
          </div>
          <CardTitle>Iniciar sesión</CardTitle>
          <CardDescription>Accedé al sistema POS desde tu cuenta personal</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                placeholder="correo@empresa.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={handleChange('password')}
                placeholder="••••••••"
                required
              />
            </div>
            {sessionMessage && !error && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {sessionMessage}
              </div>
            )}
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Ingresando...
                </span>
              ) : (
                'Ingresar'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      <AppStatusBar />
    </div>
  );
}
