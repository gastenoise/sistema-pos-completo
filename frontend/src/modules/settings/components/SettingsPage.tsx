import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBusinessPermissions } from '@/hooks/useBusinessPermissions';
import {
  getCategories,
  getPaymentMethods,
  getBankAccount,
  getSmtpConfig,
  updateBusiness,
  updateCategory,
  createCategory,
  deleteCategory,
  updatePaymentMethods,
  updateBankAccount,
  updateSmtpConfig,
  testSmtpConfig,
} from '@/modules/settings/api';
import { 
  Store, Tag, CreditCard, Plus, Pencil, Trash2, 
  Loader2, Save, Package, Lock, ShoppingBag, Coffee,
  Utensils, Shirt, Laptop, Smartphone, Book, Wrench, Home, Car, Heart,
  Gamepad, Pizza, Apple, Cake, Watch, Glasses, Plane, Music,
  Camera, Dumbbell, Paintbrush, Hammer, Scissors, Zap, Star, Gift,
  Mail, Send
} from 'lucide-react'; // Reemplaza TestTube por Send
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from 'sonner';
import { withCatalogIsActive } from '@/lib/catalogNaming';
import { getPaymentMethodIcon } from '@/utils/paymentMethodIcons';

import { useBusiness } from '@/components/pos/BusinessContext';
import { useAuth } from '@/lib/AuthContext';
import { BUSINESS_BOOLEAN_PARAMETERS, normalizeBusinessParameters } from '@/lib/businessParameters';
import ColorPickerField from '@/components/common/ColorPickerField';
import IconPickerField from '@/components/common/IconPickerField';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import PageSection from '@/components/layout/PageSection';
import { DEFAULT_COLOR_HEX, normalizeHexColor } from '@/lib/colors';
import { DEFAULT_ICON_NAME, getIconComponent, resolveIconId, resolveIconName } from '@/lib/iconCatalog';
import { TOAST_MESSAGES } from '@/lib/toastMessages';
import { mapApiErrorMessage } from '@/api/errorMapping';
import { getRoleLabel } from '@/lib/roleLabels';
import { CASH_REGISTER_PERMISSION_KEYS, SALES_PERMISSION_KEYS, useRolePermissionsFlow } from '@/modules/settings/hooks/useRolePermissionsFlow';
import { useBusinessUsersFlow } from '@/modules/settings/hooks/useBusinessUsersFlow';

const CASH_REGISTER_PERMISSION_LABELS = {
  'cash_register.view': 'Ver caja',
  'cash_register.open': 'Abrir caja',
  'cash_register.close': 'Cerrar caja',
};

const SALES_PERMISSION_LABELS = {
  'sales.void': 'Cancelar venta',
};

// Excepción explícita de negocio: owner conserva acceso de superusuario para gestionar permisos.
const OWNER_SUPERUSER_CAN_MANAGE_PERMISSIONS = true;

function BusinessUserRow({ user, updatingUserId, handleUpdateRole }: { user: any, updatingUserId: number | null, handleUpdateRole: (id: number, role: string) => Promise<void> }) {
  const [selectedRole, setSelectedRole] = useState(user.role);
  const isSaving = updatingUserId === user.id;
  const hasChanged = selectedRole !== user.role;

  useEffect(() => {
    setSelectedRole(user.role);
  }, [user.role]);

  return (
    <tr key={user.id} className="border-b last:border-0">
      <td className="px-3 py-3 font-medium text-slate-900">{user.name}</td>
      <td className="px-3 py-3 text-slate-600">{user.email}</td>
      <td className="px-3 py-3">
        <Badge variant="outline" className="capitalize">
          {getRoleLabel(user.role)}
        </Badge>
      </td>
      <td className="px-3 py-3">
        <Select
          value={selectedRole}
          onValueChange={setSelectedRole}
          disabled={isSaving}
        >
          <SelectTrigger className="h-8 w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="owner">Propietario</SelectItem>
            <SelectItem value="admin">Administrador</SelectItem>
            <SelectItem value="cashier">Cajero</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="px-3 py-3 text-right">
        <Button
          size="sm"
          disabled={!hasChanged || isSaving}
          onClick={() => handleUpdateRole(user.id, selectedRole)}
        >
          {isSaving ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Save className="h-3 w-3 mr-1" />
          )}
          {isSaving ? 'Guardando...' : 'Guardar'}
        </Button>
      </td>
    </tr>
  );
}

export default function Settings() {
  const { businessId, currentBusiness, refreshCurrentBusiness } = useBusiness();
  const queryClient = useQueryClient();
  const { user, updateUser } = useAuth();
  const { role, can } = useBusinessPermissions(businessId);
  const [activeTab, setActiveTab] = useState('business');
  
  const [businessData, setBusinessData] = useState({
    name: '',
    business_email: '',
    address: '',
    phone: '',
    tax_id: '',
    color: DEFAULT_COLOR_HEX,
    currency: 'ARS',
    business_parameters: {}
  });
  const [savingBusinessInfo, setSavingBusinessInfo] = useState(false);
  const [savingCurrency, setSavingCurrency] = useState(false);
  const [savingBusinessParameters, setSavingBusinessParameters] = useState(false);
  const [allowedLoginIp, setAllowedLoginIp] = useState('');
  const [savingAllowedLoginIp, setSavingAllowedLoginIp] = useState(false);
  const businessInfoFormRef = useRef(null);
  
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryData, setCategoryData] = useState({ name: '', color: DEFAULT_COLOR_HEX, icon: DEFAULT_ICON_NAME });
  const [savingCategory, setSavingCategory] = useState(false);

  const [paymentStates, setPaymentStates] = useState({});
  const [defaultPaymentId, setDefaultPaymentId] = useState(null);
  const [savingPayments, setSavingPayments] = useState(false);
  
  const [bankData, setBankData] = useState({
    bank_name: '',
    cbu: '',
    alias: '',
    account_holder_name: ''
  });
  const [savingBank, setSavingBank] = useState(false);
  const [cbuTooLong, setCbuTooLong] = useState(false);
  const bankFormRef = useRef(null);
  
  const [smtpData, setSmtpData] = useState({
    host: '',
    port: 587,
    username: '',
    password: '',
    encryption: 'tls',
    from_name: '',
    from_email: ''
  });
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const smtpFormRef = useRef(null);
  
  const [showPremiumDialog, setShowPremiumDialog] = useState(false);
  const [modules, setModules] = useState({
    inventory: true,
    customers: false,
    invoicing: false,
    analytics: false,
    loyalty: false,
  });

  useEffect(() => {
    if (currentBusiness) {
      setBusinessData({
        name: currentBusiness.name || '',
        business_email: currentBusiness.email || currentBusiness.business_email || '',
        address: currentBusiness.address || '',
        phone: currentBusiness.phone || '',
        tax_id: currentBusiness.tax_id || '',
        color: normalizeHexColor(currentBusiness.color || DEFAULT_COLOR_HEX),
        currency: currentBusiness.currency || 'ARS',
        business_parameters: normalizeBusinessParameters(currentBusiness)
      });
    }
  }, [currentBusiness]);

  useEffect(() => {
    setAllowedLoginIp(user?.allowed_login_ip || '');
  }, [user?.allowed_login_ip]);

  const updateCategoryCache = (response) => {
    if (response?.id) {
      const normalizedEntity = withCatalogIsActive(response);
      queryClient.setQueryData(['categories', businessId], (prev = []) => {
        const safePrev = Array.isArray(prev) ? prev : [];
        const exists = safePrev.find((category) => category.id === normalizedEntity.id);
        if (exists) {
          return safePrev.map((category) => (
            category.id === normalizedEntity.id ? { ...category, ...normalizedEntity } : category
          ));
        }
        return [normalizedEntity, ...safePrev];
      });
      return true;
    }
    return false;
  };

  // Fetch categories
  const { data: categories = [], isLoading: loadingCategories, isFetching: fetchingCategories } = useQuery({
    queryKey: ['categories', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      return getCategories();
    },
    enabled: !!businessId
  });

  // Fetch payment methods
  const { data: paymentMethods = [], isLoading: loadingPayments, isFetching: fetchingPayments } = useQuery({
    queryKey: ['paymentMethods', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      return getPaymentMethods();
    },
    enabled: !!businessId
  });

  // Fetch bank account data
  const { data: bankAccount } = useQuery({
    queryKey: ['bankAccount', businessId],
    queryFn: async () => {
      if (!businessId) return null;
      return getBankAccount();
    },
    enabled: !!businessId
  });

  // Fetch SMTP config
  const { data: smtpConfig } = useQuery({
    queryKey: ['smtpConfig', businessId],
    queryFn: async () => {
      if (!businessId) return null;
      return getSmtpConfig();
    },
    enabled: !!businessId
  });

  useEffect(() => {
    if (smtpConfig) {
      setSmtpData({
        host: smtpConfig.host || '',
        port: smtpConfig.port || 587,
        username: smtpConfig.username || '',
        password: smtpConfig.password || '',
        encryption: smtpConfig.encryption || 'tls',
        from_name: smtpConfig.from_name || '',
        from_email: smtpConfig.from_email || ''
      });
    }
  }, [smtpConfig]);

  useEffect(() => {
    if (paymentMethods.length > 0) {
      const states = {};
      paymentMethods.forEach(m => {
        const isCash = (m.type || m.code) === 'cash';
        states[m.id] = isCash ? true : m.is_active;
      });
      setPaymentStates(states);
      
      const defaultMethod = paymentMethods.find(m => m.is_default)
        || paymentMethods.find(m => (m.type || m.code) === 'cash');
      setDefaultPaymentId(defaultMethod?.id || null);
    }
  }, [paymentMethods]);

  useEffect(() => {
    if (bankAccount) {
      setBankData({
        bank_name: bankAccount.bank_name || '',
        cbu: bankAccount.cbu || '',
        alias: bankAccount.alias || '',
        account_holder_name: bankAccount.account_holder_name || ''
      });
    }
  }, [bankAccount]);

  const syncBusinessState = (nextBusiness) => {
    refreshCurrentBusiness(nextBusiness);
    setBusinessData({
      name: nextBusiness.name || '',
      business_email: nextBusiness.email || nextBusiness.business_email || '',
      address: nextBusiness.address || '',
      phone: nextBusiness.phone || '',
      tax_id: nextBusiness.tax_id || '',
      color: normalizeHexColor(nextBusiness.color || DEFAULT_COLOR_HEX),
      currency: nextBusiness.currency || 'ARS',
      business_parameters: normalizeBusinessParameters(nextBusiness)
    });
  };

  const showSettingsOverlay = fetchingCategories || fetchingPayments || savingCategory || savingPayments;

  const handleSaveBusinessInfo = async (event) => {
    event?.preventDefault();
    const form = businessInfoFormRef.current;
    if (form && !form.reportValidity()) {
      return;
    }
    if (!currentBusiness) return;
    setSavingBusinessInfo(true);
    try {
      const payload = {
        name: businessData.name,
        address: businessData.address,
        phone: businessData.phone,
        tax_id: businessData.tax_id,
        color: normalizeHexColor(businessData.color),
        email: businessData.business_email || undefined,
      };
      const updated = await updateBusiness(payload);
      const mergedBusiness = { ...currentBusiness, ...updated };
      syncBusinessState(mergedBusiness);
      queryClient.invalidateQueries({ queryKey: ['business-permissions'] });
      toast.success(TOAST_MESSAGES.settings.businessInfoSaved);
    } catch (error) {
      toast.error(mapApiErrorMessage(error, TOAST_MESSAGES.settings.businessInfoSaveError));
    } finally {
      setSavingBusinessInfo(false);
    }
  };

  const handleSaveBusinessParameters = async (event) => {
    event?.preventDefault();
    if (!currentBusiness) return;
    setSavingBusinessParameters(true);
    try {
      const payload = {
        business_parameters: businessData.business_parameters,
        currency: businessData.currency
      };
      const updated = await updateBusiness(payload);
      const mergedBusiness = { ...currentBusiness, ...updated };
      syncBusinessState(mergedBusiness);
      queryClient.invalidateQueries({ queryKey: ['business-permissions'] });
      toast.success(TOAST_MESSAGES.settings.businessOptionsSaved);
    } catch (error) {
      toast.error(mapApiErrorMessage(error, TOAST_MESSAGES.settings.businessOptionsSaveError));
    } finally {
      setSavingBusinessParameters(false);
    }
  };

  const handleSaveCategory = async () => {
    setSavingCategory(true);
    try {
      const categoryPayload = {
        ...categoryData,
        icon: resolveIconId(categoryData.icon),
      };

      if (editingCategory) {
        const response = await updateCategory(editingCategory.id, categoryPayload);
        updateCategoryCache(response);
        toast.success(TOAST_MESSAGES.settings.categoryUpdated);
      } else {
        const response = await createCategory({ ...categoryPayload, is_active: true });
        updateCategoryCache(response);
        toast.success(TOAST_MESSAGES.settings.categoryCreated);
      }
      queryClient.invalidateQueries({ queryKey: ['categories', businessId] });
      setShowCategoryModal(false);
      setEditingCategory(null);
      setCategoryData({ name: '', color: DEFAULT_COLOR_HEX, icon: DEFAULT_ICON_NAME });
    } catch (error) {
      toast.error(mapApiErrorMessage(error, TOAST_MESSAGES.settings.categorySaveError));
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (category) => {
    try {
      const response = await deleteCategory(category.id);
      updateCategoryCache(response);
      queryClient.invalidateQueries({ queryKey: ['categories', businessId] });
      toast.success(TOAST_MESSAGES.settings.categoryDeleted);
    } catch (error) {
      toast.error(mapApiErrorMessage(error, TOAST_MESSAGES.settings.categoryDeleteError));
    }
  };

  const handleSavePaymentMethods = async () => {
    setSavingPayments(true);
    try {
      const methods = paymentMethods.reduce((acc, method) => {
        acc[method.id] = !!paymentStates[method.id];
        return acc;
      }, {});
      await updatePaymentMethods({
        methods,
        preferred_payment_method_id: defaultPaymentId
      });
      queryClient.invalidateQueries({ queryKey: ['paymentMethods', businessId] });
      toast.success(TOAST_MESSAGES.settings.paymentMethodsSaved);
    } catch (error) {
      toast.error(mapApiErrorMessage(error, TOAST_MESSAGES.settings.paymentMethodsSaveError));
    } finally {
      setSavingPayments(false);
    }
  };

  const handleSetDefaultPayment = (paymentMethodId) => {
    setDefaultPaymentId(paymentMethodId);
    setPaymentStates((prev) => ({
      ...prev,
      [paymentMethodId]: true
    }));
  };

  const handleSaveBankData = async (event) => {
    event?.preventDefault();
    const form = bankFormRef.current;
    if (form && !form.reportValidity()) {
      return;
    }
    setSavingBank(true);
    try {
      await updateBankAccount(bankData);
      toast.success(TOAST_MESSAGES.settings.bankAccountSaved);
      queryClient.invalidateQueries({ queryKey: ['bankAccount', businessId] });
    } catch (error) {
      toast.error(mapApiErrorMessage(error, TOAST_MESSAGES.settings.bankAccountSaveError));
    } finally {
      setSavingBank(false);
    }
  };

  const handleSaveSmtp = async (event) => {
    event?.preventDefault();
    const form = smtpFormRef.current;
    if (form && !form.reportValidity()) {
      return;
    }
    setSavingSmtp(true);
    try {
      const fallbackEmail = currentBusiness?.email || currentBusiness?.business_email || '';
      if (!smtpData.from_email?.trim() && !fallbackEmail) {
        toast.error(TOAST_MESSAGES.settings.businessEmailRequiredForSmtp);
        return;
      }
      if (!smtpData.port || Number.isNaN(smtpData.port)) {
        toast.error(TOAST_MESSAGES.settings.smtpPortRequired);
        return;
      }
      const payload = {
        ...smtpData,
        from_name: smtpData.from_name?.trim() || currentBusiness?.name || '',
        from_email: smtpData.from_email?.trim() || fallbackEmail
      };
      await updateSmtpConfig(payload);
      toast.success(TOAST_MESSAGES.settings.smtpConfigSaved);
      queryClient.invalidateQueries({ queryKey: ['smtpConfig', businessId] });
      queryClient.invalidateQueries({ queryKey: ['smtpStatus', businessId] });
    } catch (error) {
      toast.error(mapApiErrorMessage(error, TOAST_MESSAGES.settings.smtpConfigSaveError));
    } finally {
      setSavingSmtp(false);
    }
  };

  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    try {
      const fallbackEmail = currentBusiness?.email || currentBusiness?.business_email || '';
      const targetEmail = user?.email || smtpData.from_email || fallbackEmail;
      if (!targetEmail) {
        toast.error(TOAST_MESSAGES.settings.smtpRecipientRequired);
        return;
      }
      const payload: any = {
        to_email: targetEmail
      };
      if (smtpData.host) payload.host = smtpData.host;
      if (smtpData.port) payload.port = smtpData.port;
      if (smtpData.username) payload.username = smtpData.username;
      if (smtpData.password) payload.password = smtpData.password;
      if (smtpData.encryption) payload.encryption = smtpData.encryption;
      if (smtpData.from_name?.trim()) {
        payload.from_name = smtpData.from_name.trim();
      } else if (currentBusiness?.name) {
        payload.from_name = currentBusiness.name;
      }
      if (smtpData.from_email?.trim()) {
        payload.from_email = smtpData.from_email.trim();
      } else if (fallbackEmail) {
        payload.from_email = fallbackEmail;
      }
      const response = await testSmtpConfig(payload);
      toast.success(response?.message || TOAST_MESSAGES.settings.smtpTestSuccess);
    } catch (error) {
      const message = error?.data?.message || error?.message || 'SMTP test failed';
      toast.error(message);
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleToggleModule = (moduleKey, isPremium) => {
    if (isPremium && !modules[moduleKey]) {
      setShowPremiumDialog(true);
      return;
    }
    setModules(prev => ({ ...prev, [moduleKey]: !prev[moduleKey] }));
    toast.success(TOAST_MESSAGES.settings.moduleToggleSuccess(!modules[moduleKey]));
  };


  const handleSaveAllowedLoginIp = async (event) => {
    event?.preventDefault();
    setSavingAllowedLoginIp(true);

    try {
      await updateUser({ allowed_login_ip: allowedLoginIp.trim() || null });
      toast.success('Restricción de IP actualizada correctamente.');
    } catch (error) {
      toast.error(error?.message || 'No pudimos actualizar la restricción de IP.');
    } finally {
      setSavingAllowedLoginIp(false);
    }
  };

  const handleClearAllowedLoginIp = async () => {
    setSavingAllowedLoginIp(true);

    try {
      await updateUser({ allowed_login_ip: null });
      setAllowedLoginIp('');
      toast.success('Restricción de IP eliminada.');
    } catch (error) {
      toast.error(mapApiErrorMessage(error, 'No pudimos eliminar la restricción de IP.'));
    } finally {
      setSavingAllowedLoginIp(false);
    }
  };


  const handleRolePermissionsLoadError = useCallback((message) => {
    toast.error(message);
  }, []);

  const handleRolePermissionsSaveError = useCallback((message) => {
    toast.error(message);
  }, []);

  const handleRolePermissionsSaveSuccess = useCallback(() => {
    toast.success('Permisos actualizados correctamente.');
  }, []);

  const {
    canManageRolePermissions,
    rolePermissions,
    savingRolePermissions,
    handleRolePermissionChange,
    saveRolePermissions,
  } = useRolePermissionsFlow({
    businessId,
    can,
    role,
    allowOwnerOverride: OWNER_SUPERUSER_CAN_MANAGE_PERMISSIONS,
    onLoadError: handleRolePermissionsLoadError,
    onSaveError: handleRolePermissionsSaveError,
    onSaveSuccess: handleRolePermissionsSaveSuccess,
  });

  const {
    users: businessUsers,
    isLoading: loadingBusinessUsers,
    updatingUserId,
    handleUpdateRole,
  } = useBusinessUsersFlow(businessId);


  const openEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryData({ 
      name: category.name, 
      color: normalizeHexColor(category.color || DEFAULT_COLOR_HEX),
      icon: resolveIconName(category.icon)
    });
    setShowCategoryModal(true);
  };



  return (
    <>
      <PageContainer>
        <PageHeader
          title="Ajustes del Negocio"
          description="Administrá la configuración de tu negocio"
        />

        <PageSection>
          {showSettingsOverlay && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/50">
              <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando…
              </div>
            </div>
          )}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="mb-6 md:hidden">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar sección" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="business">Negocio</SelectItem>
                <SelectItem value="categories">Categorías</SelectItem>
                <SelectItem value="payments">Cobros y Pagos</SelectItem>
                <SelectItem value="integrations">Integraciones</SelectItem>
                {canManageRolePermissions && (
                  <SelectItem value="permissions">Usuarios</SelectItem>
                )}
                <SelectItem value="modules">Módulos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TabsList className="mb-6 hidden md:inline-flex">
            <TabsTrigger value="business" className="gap-2">
              <Store className="w-4 h-4" />
              Negocio
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2">
              <Tag className="w-4 h-4" />
              Categorías
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-2">
              <CreditCard className="w-4 h-4" />
              Cobros y Pagos
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-2">
              <Mail className="w-4 h-4" />
              Integraciones
            </TabsTrigger>
            {canManageRolePermissions && (
              <TabsTrigger value="permissions" className="gap-2">
                <Lock className="w-4 h-4" />
                Usuarios
              </TabsTrigger>
            )}
            <TabsTrigger value="modules" className="gap-2">
              <Package className="w-4 h-4" />
              Módulos
            </TabsTrigger>
          </TabsList>

          {/* Business Tab */}
          <TabsContent value="business" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Información del negocio</CardTitle>
                <CardDescription>Actualizá los detalles de tu negocio</CardDescription>
              </CardHeader>
              <CardContent>
                <form ref={businessInfoFormRef} className="space-y-4" onSubmit={handleSaveBusinessInfo}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Nombre</Label>
                      <Input
                        disabled
                        value={businessData.name}
                        onChange={(e) => setBusinessData({ ...businessData, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>E-mail</Label>
                      <Input
                        disabled
                        type="email"
                        value={businessData.business_email}
                        onChange={(e) => setBusinessData({ ...businessData, business_email: e.target.value })}
                        placeholder="contact@business.com"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Dirección</Label>
                      <Input
                        value={businessData.address}
                        onChange={(e) => setBusinessData({ ...businessData, address: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Teléfono</Label>
                      <Input
                        value={businessData.phone}
                        onChange={(e) => setBusinessData({ ...businessData, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>CUIT</Label>
                      <Input
                        value={businessData.tax_id}
                        onChange={(e) => setBusinessData({ ...businessData, tax_id: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2">
                      <ColorPickerField
                        id="business-color"
                        label="Color característico"
                        value={businessData.color}
                        onChange={(color) => setBusinessData({ ...businessData, color })}
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={savingBusinessInfo}>
                    {savingBusinessInfo ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Guardar Información
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Seguridad de cuenta</CardTitle>
                <CardDescription>
                  Permití el acceso solo desde una IP específica. Si lo dejás vacío, no se aplica restricción.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleSaveAllowedLoginIp}>
                  <div>
                    <Label>IP permitida (IPv4 o IPv6)</Label>
                    <Input
                      value={allowedLoginIp}
                      onChange={(e) => setAllowedLoginIp(e.target.value)}
                      placeholder="Ej: 203.0.113.5"
                    />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button type="submit" disabled={savingAllowedLoginIp}>
                      {savingAllowedLoginIp ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Guardar IP
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={savingAllowedLoginIp || !allowedLoginIp}
                      onClick={handleClearAllowedLoginIp}
                    >
                      Quitar restricción
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Variables del negocio</CardTitle>
                <CardDescription>
                  Modifica algunas funcionalidades para este negocio
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleSaveBusinessParameters}>
                  <div className="space-y-4">
                    {BUSINESS_BOOLEAN_PARAMETERS.map((parameter) => (
                      <div key={parameter.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{parameter.label}</p>
                          <p className="text-xs text-slate-500">{parameter.description}</p>
                        </div>
                        <Switch
                          checked={Boolean(businessData.business_parameters?.[parameter.id])}
                          onCheckedChange={(checked) => setBusinessData((prev) => ({
                            ...prev,
                            business_parameters: {
                              ...(prev.business_parameters || {}),
                              [parameter.id]: checked
                            }
                          }))}
                        />
                      </div>
                    ))}

                    {/* Nueva sección: Moneda, estilo igual al bloque de parámetros de negocio */}
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">Moneda</p>
                        <p className="text-xs text-slate-500">Seleccioná la moneda principal de tu negocio</p>
                      </div>
                      <div className="flex-shrink-0">
                        <Select
                          value={businessData.currency}
                          onValueChange={(v) => setBusinessData({ ...businessData, currency: v })}
                        >
                          <SelectTrigger id="currency-select" className="min-w-0 w-auto">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ARS">ARS - Pesos</SelectItem>
                            <SelectItem value="USD">USD - Dólares</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <Button type="submit" disabled={savingBusinessParameters}>
                    {savingBusinessParameters ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Guardar Opciones
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Categorías</CardTitle>
                  <CardDescription className="pt-1">Seccioná tus productos en diferentes categorías</CardDescription>
                </div>
                <Button onClick={() => { setEditingCategory(null); setCategoryData({ name: '', color: DEFAULT_COLOR_HEX, icon: DEFAULT_ICON_NAME }); setShowCategoryModal(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Añadir
                </Button>
              </CardHeader>
              <CardContent>
                {loadingCategories ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : categories.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">No categories yet</p>
                ) : (
                  <div className="space-y-2">
                    {categories.map((category) => {
                     const IconComponent = getIconComponent(category.icon);
                     return (
                       <div key={category.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                         <div className="flex items-center gap-3">
                           <div 
                             className="w-8 h-8 rounded-lg flex items-center justify-center" 
                             style={{ backgroundColor: `${normalizeHexColor(category.color || DEFAULT_COLOR_HEX)}20` }}
                           >
                             <IconComponent className="w-4 h-4" style={{ color: normalizeHexColor(category.color || DEFAULT_COLOR_HEX) }} />
                           </div>
                           <span className="font-medium">{category.name}</span>
                           {/* {category.is_active === false && (
                             <Badge variant="secondary">Inactive</Badge>
                           )} */}
                         </div>
                         <Button variant="ghost" size="icon" onClick={() => openEditCategory(category)}>
                           <Pencil className="w-4 h-4" />
                         </Button>
                       </div>
                     );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Methods Tab */}
          <TabsContent value="payments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Métodos de pago</CardTitle>
                <CardDescription>Activá o desactivá los métodos de pago que trabajás</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingPayments ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      {paymentMethods.map((method) => {
                        const IconComponent = getPaymentMethodIcon(method.icon);
                        const isCash = (method.type || method.code) === 'cash';
                        const isMercadoPago = (method.type || method.code) === 'mercado_pago';
                        const isMpDisabled = isMercadoPago && method.enabled === false;

                        const isDefaultPayment = method.id === defaultPaymentId
                          || method.is_default
                          || method.preferred;
                        return (
                          <div key={method.id} className={`flex items-center justify-between p-4 bg-slate-50 rounded-lg ${isMpDisabled ? 'opacity-70' : ''}`}>
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-10 h-10 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: (method.color || '#6B7280') + '20' }}
                              >
                                <IconComponent 
                                  className="w-5 h-5" 
                                  style={{ color: method.color || '#6B7280' }} 
                                />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{method.name}</span>
                                  {isMpDisabled && (
                                    <Badge variant="secondary" className="bg-gray-200 text-gray-600 text-[10px] h-4 px-1">
                                      En desarrollo
                                    </Badge>
                                  )}
                                </div>
                                {/* <p className="text-xs text-slate-500 capitalize">{method.type}</p> */}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => !isMpDisabled && handleSetDefaultPayment(method.id)}
                                disabled={isMpDisabled}
                                className={`p-2 rounded transition-colors ${
                                  defaultPaymentId === method.id 
                                    ? 'text-yellow-500 hover:text-yellow-600' 
                                    : isMpDisabled
                                      ? 'text-slate-200 cursor-not-allowed'
                                      : 'text-slate-300 hover:text-slate-400'
                                }`}
                                title={isMpDisabled ? 'No disponible' : (defaultPaymentId === method.id ? 'Default payment method' : 'Set as default')}
                              >
                                <Star className="w-5 h-5" fill={defaultPaymentId === method.id ? 'currentColor' : 'none'} />
                              </button>
                              <Switch
                                checked={(!isMpDisabled && (isCash || isDefaultPayment || paymentStates[method.id])) || false}
                                disabled={isCash || isDefaultPayment || isMpDisabled}
                                onCheckedChange={(checked) => 
                                  setPaymentStates(prev => ({ ...prev, [method.id]: checked }))
                                }
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <Button onClick={handleSavePaymentMethods} disabled={savingPayments}>
                      {savingPayments ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Guardar Cambios
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bank Account Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Datos bancarios</CardTitle>
                <CardDescription>Cargá los detalles de tu cuenta bancaria para pagos por transferencia</CardDescription>
              </CardHeader>
              <CardContent>
                <form ref={bankFormRef} className="space-y-4" onSubmit={handleSaveBankData}>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Nombre del banco</Label>
                      <Input
                        value={bankData.bank_name}
                        onChange={(e) => setBankData({ ...bankData, bank_name: e.target.value })}
                        placeholder="e.g., Banco Galicia"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Propietario de la cuenta</Label>
                      <Input
                        value={bankData.account_holder_name}
                        onChange={(e) => setBankData({ ...bankData, account_holder_name: e.target.value })}
                        placeholder="Account holder name"
                      />
                    </div>
                    <div>
                      <Label>CBU / CVU</Label>
                      <Input
                        value={bankData.cbu}
                        onChange={(e) => {
                          const digitsOnly = e.target.value.replace(/\D/g, '');
                          setCbuTooLong(digitsOnly.length > 22);
                          setBankData({ ...bankData, cbu: digitsOnly.slice(0, 22) });
                        }}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={22}
                        placeholder="0123456789012345678901"
                      />
                      {cbuTooLong && (
                        <p className="mt-1 text-xs text-red-600">
                          El CBU debe tener 22 dígitos o menos.
                        </p>
                      )}
                    </div>
                    <div>
                      <Label>Alias</Label>
                      <Input
                        value={bankData.alias}
                        onChange={(e) => setBankData({ ...bankData, alias: e.target.value })}
                        placeholder="alias.mi.cuenta"
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={savingBank}>
                    {savingBank ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Guardar Datos
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations">
            <Card>
              <CardHeader>
                <CardTitle>Configuración SMTP</CardTitle>
                <CardDescription>Configurá los datos para enviar tickets o notificaciones por e-mail</CardDescription>
              </CardHeader>
              <CardContent>
                <form ref={smtpFormRef} className="space-y-4" onSubmit={handleSaveSmtp}>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                      <Label>Servidor</Label>
                      <Input
                        required
                        value={smtpData.host}
                        onChange={(e) => setSmtpData({ ...smtpData, host: e.target.value })}
                        placeholder="smtp.example.com"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <Label>Puerto</Label>
                      <Input
                        required
                        min={1}
                        type="number"
                        value={smtpData.port}
                        onChange={(e) => setSmtpData({ ...smtpData, port: parseInt(e.target.value, 10) })}
                        placeholder="587"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <Label>Usuario</Label>
                      <Input
                        required
                        value={smtpData.username}
                        onChange={(e) => setSmtpData({ ...smtpData, username: e.target.value })}
                        placeholder="user@example.com"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <Label>Contraseña</Label>
                      <Input
                        required={!smtpConfig}
                        type="password"
                        value={smtpData.password}
                        onChange={(e) => setSmtpData({ ...smtpData, password: e.target.value })}
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <Label>Encriptación</Label>
                      <Select value={smtpData.encryption} onValueChange={(v) => setSmtpData({ ...smtpData, encryption: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Ninguna</SelectItem>
                          <SelectItem value="tls">TLS</SelectItem>
                          <SelectItem value="ssl">SSL</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Sender info grouped in a small card */}
                    <div className="col-span-2">
                      <Card className="border border-slate-200 bg-slate-50">
                        <CardHeader className="py-2 px-3">
                          <CardTitle className="text-sm font-semibold text-slate-700">Remitente</CardTitle>
                        </CardHeader>
                        <CardContent className="px-3 pb-3 pt-0">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <Label>Nombre</Label>
                              <Input
                                value={smtpData.from_name}
                                onChange={(e) => setSmtpData({ ...smtpData, from_name: e.target.value })}
                                placeholder={currentBusiness?.name || 'My Business'}
                              />
                            </div>
                            <div>
                              <Label>E-mail</Label>
                              <Input
                                type="email"
                                value={smtpData.from_email}
                                onChange={(e) => setSmtpData({ ...smtpData, from_email: e.target.value })}
                                placeholder={currentBusiness?.email || currentBusiness?.business_email || 'noreply@example.com'}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button type="submit" disabled={savingSmtp}>
                      {savingSmtp ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Guardar Configuración
                    </Button>
                    <Button type="button" variant="outline" onClick={handleTestSmtp} disabled={testingSmtp}>
                      {testingSmtp ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      Testear SMTP
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {canManageRolePermissions && (
            <TabsContent value="permissions" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Gestión de usuarios</CardTitle>
                  <CardDescription>
                    Administrá los usuarios asociados a tu negocio y sus roles.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingBusinessUsers ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[600px] text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="px-3 py-2 text-left font-medium text-slate-600">Usuario</th>
                            <th className="px-3 py-2 text-left font-medium text-slate-600">Email</th>
                            <th className="px-3 py-2 text-left font-medium text-slate-600">Rol actual</th>
                            <th className="px-3 py-2 text-left font-medium text-slate-600">Nuevo rol</th>
                            <th className="px-3 py-2 text-right font-medium text-slate-600">Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {businessUsers.map((u: any) => (
                            <BusinessUserRow
                              key={u.id}
                              user={u}
                              updatingUserId={updatingUserId}
                              handleUpdateRole={handleUpdateRole}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Permisos por perfil</CardTitle>
                  <CardDescription>
                    Definí qué acciones de caja puede realizar cada perfil operativo.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-slate-500">Esta matriz administra permisos de caja y ventas. El permiso <code>settings.permissions.manage</code> se conserva internamente para mantener consistencia del payload.</p>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[480px] text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="px-3 py-2 text-left font-medium text-slate-600">Perfil</th>
                          {CASH_REGISTER_PERMISSION_KEYS.map((permissionKey) => (
                            <th key={permissionKey} className="px-3 py-2 text-left font-medium text-slate-600">
                              {CASH_REGISTER_PERMISSION_LABELS[permissionKey]}
                            </th>
                          ))}
                          {SALES_PERMISSION_KEYS.map((permissionKey) => (
                            <th key={permissionKey} className="px-3 py-2 text-left font-medium text-slate-600">
                              {SALES_PERMISSION_LABELS[permissionKey]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {['admin', 'cashier'].map((targetRole) => (
                          <tr key={targetRole} className="border-b last:border-0">
                            <td className="px-3 py-3 font-medium text-slate-900">{getRoleLabel(targetRole)}</td>
                            {CASH_REGISTER_PERMISSION_KEYS.map((permissionKey) => (
                              <td key={`${targetRole}-${permissionKey}`} className="px-3 py-3">
                                <Switch
                                  checked={Boolean(rolePermissions?.[targetRole]?.[permissionKey])}
                                  onCheckedChange={(checked) => handleRolePermissionChange(targetRole, permissionKey, checked)}
                                />
                              </td>
                            ))}
                            {SALES_PERMISSION_KEYS.map((permissionKey) => (
                              <td key={`${targetRole}-${permissionKey}`} className="px-3 py-3">
                                <Switch
                                  checked={Boolean(rolePermissions?.[targetRole]?.[permissionKey])}
                                  onCheckedChange={(checked) => handleRolePermissionChange(targetRole, permissionKey, checked)}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <Button onClick={saveRolePermissions} disabled={savingRolePermissions}>
                    {savingRolePermissions ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Guardar permisos
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Modules Tab */}
          <TabsContent value="modules">
            <Card>
              <CardHeader>
                <CardTitle>Módulos del Sistema</CardTitle>
                <CardDescription>Activá o descativá funciones adicionales</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">Caja registradora</p>
                    <p className="text-sm text-slate-500">Llevá el recuento de tu efectivo en caja con movimientos de apertura y cierre</p>
                  </div>
                  <Switch
                    checked={modules.inventory}
                    onCheckedChange={() => handleToggleModule('caja', false)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900">Control de stock y proveedores</p>
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                        <Lock className="w-3 h-3 mr-1" />
                        Premium
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500">Cargá tus pagos a proveedores, stock previsto, y armá tus pedidos de manera rápida</p>
                  </div>
                  <Switch
                    checked={modules.invoicing}
                    onCheckedChange={() => handleToggleModule('invoicing', true)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900">Sistema de suscripciones</p>
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                        <Lock className="w-3 h-3 mr-1" />
                        Premium
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500">Vendé suscripciones mensuales y llevá el registro contable de tus clientes</p>
                  </div>
                  <Switch
                    checked={modules.customers}
                    onCheckedChange={() => handleToggleModule('customers', true)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900">Catálogo digital</p>
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                        <Lock className="w-3 h-3 mr-1" />
                        Premium
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500">Cargá fotos y detalles de tus productos y generá ventas desde sitios externos</p>
                  </div>
                  <Switch
                    checked={modules.analytics}
                    onCheckedChange={() => handleToggleModule('analytics', true)}
                  />
                </div>

                {/* Nuevo módulo: Facturación (En desarrollo) */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg opacity-60 cursor-not-allowed">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900">Facturación electrónica</p>
                      <Badge variant="secondary" className="bg-gray-200 text-gray-600">
                        En desarrollo
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500">Generá facturas electrónicas con CAE directamente desde el sistema (próximamente)</p>
                  </div>
                  <Switch 
                    checked={false}
                    onCheckedChange={() => {}} // No hace nada
                    disabled
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </PageSection>
      </PageContainer>

      {/* Premium Dialog */}
      <Dialog open={showPremiumDialog} onOpenChange={setShowPremiumDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-600" />
              Función Premium
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-slate-600">
              Este módulo está disponible solo con el plan Premium. Mejorá tu cuenta ahora para desbloquear funciones avanzadas y llevar tu negocio al próximo nivel.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">El plan Premium incluye:</p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Control de stock y proveedores</li>
                <li>• Sistema de suscripciones</li>
                <li>• Facturación electrónica</li>
                <li>• Catálogo digital</li>
                <li>• Análisis avanzado</li>
                <li>• Soporte prioritario</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowPremiumDialog(false)}>
                Cancelar
              </Button>
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
                Mejorar a Premium
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Category Modal */}
      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Editar Categoría' : 'Agregar Categoría'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre</Label>
              <Input
                value={categoryData.name}
                onChange={(e) => setCategoryData({ ...categoryData, name: e.target.value })}
                placeholder="Category name"
              />
            </div>
            <div>
              <ColorPickerField
                id="category-color"
                label="Color de la categoría"
                value={categoryData.color}
                onChange={(color) => setCategoryData({ ...categoryData, color })}
              />
              {/* <p className="mt-1 text-xs text-slate-500">
                Elegí un color predefinido o ingresá uno en formato HEX.
              </p> */}
            </div>
            <div>
              <IconPickerField
                id="category-icon"
                label="Ícono"
                value={categoryData.icon}
                onChange={(icon) => setCategoryData({ ...categoryData, icon })}
              />
            </div>
            <div className="flex justify-between gap-3">
              {editingCategory && (
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    handleDeleteCategory(editingCategory);
                    setShowCategoryModal(false);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Borrar
                </Button>
              )}
              <div className="flex gap-3 ml-auto">
                <Button variant="outline" onClick={() => setShowCategoryModal(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveCategory} disabled={savingCategory || !categoryData.name}>
                  {savingCategory && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Guardar
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>


    </>
  );
}
