import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/api/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Store, Tag, CreditCard, Plus, Pencil, Trash2, 
  Loader2, Save, Package, Lock, ShoppingBag, Coffee,
  Utensils, Shirt, Laptop, Smartphone, Book, Wrench, Home, Car, Heart,
  Gamepad, Pizza, Apple, Cake, Watch, Glasses, Plane, Music,
  Camera, Dumbbell, Paintbrush, Hammer, Scissors, Zap, Star, Gift,
  Mail, TestTube
} from 'lucide-react';
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
import { normalizeEntityResponse, normalizeListResponse } from '@/lib/normalizeResponse';
import { mapCatalogIsActive, withCatalogIsActive } from '@/lib/catalogNaming';
import { getPaymentMethodIcon } from '@/utils/paymentMethodIcons';

import { useBusiness } from '../components/pos/BusinessContext';
import { useAuth } from '../lib/AuthContext';
import TopNav from '../components/pos/TopNav';

export default function Settings() {
  const { businessId, currentBusiness, selectBusiness } = useBusiness();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  
  const [businessData, setBusinessData] = useState({
    name: '',
    business_email: '',
    address: '',
    phone: '',
    tax_id: '',
    currency: 'ARS'
  });
  const [savingBusiness, setSavingBusiness] = useState(false);
  const businessFormRef = useRef(null);
  
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryData, setCategoryData] = useState({ name: '', color: '#3B82F6', icon: 'Package' });
  const [savingCategory, setSavingCategory] = useState(false);

  const availableIcons = [
    'Package', 'ShoppingBag', 'Coffee', 'Utensils', 'Shirt', 'Laptop', 
    'Smartphone', 'Book', 'Wrench', 'Home', 'Car', 'Heart',
    'Gamepad', 'Pizza', 'Apple', 'Cake', 'Watch', 'Glasses',
    'Plane', 'Music', 'Camera', 'Dumbbell', 'Paintbrush', 'Hammer',
    'Scissors', 'Zap', 'Star', 'Gift', 'Tag', 'CreditCard'
  ];

  const iconComponents = {
    Package, ShoppingBag, Coffee, Utensils, Shirt, Laptop, 
    Smartphone, Book, Wrench, Home, Car, Heart, Gamepad, Pizza, 
    Apple, Cake, Watch, Glasses, Plane, Music, Camera, Dumbbell, 
    Paintbrush, Hammer, Scissors, Zap, Star, Gift, Tag, CreditCard
  };

  const availableColors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899',
    '#06B6D4', '#84CC16', '#F97316', '#DC2626', '#7C3AED', '#DB2777',
    '#0EA5E9', '#22C55E', '#EAB308', '#F43F5E', '#A855F7', '#E11D48',
    '#0284C7', '#16A34A', '#CA8A04', '#BE123C', '#9333EA', '#C026D3',
    '#0369A1', '#15803D', '#A16207', '#9F1239', '#7E22CE', '#A21CAF'
  ];

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
        currency: currentBusiness.currency || 'ARS'
      });
    }
  }, [currentBusiness]);

  const updateCategoryCache = (response) => {
    const list = mapCatalogIsActive(normalizeListResponse(response, 'categories'));
    if (list.length > 0) {
      queryClient.setQueryData(['categories', businessId], list);
      return true;
    }
    const entity = normalizeEntityResponse(response);
    if (entity?.id) {
      const normalizedEntity = withCatalogIsActive(entity);
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
  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['categories', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const response = await apiClient.get('/protected/categories');
      return mapCatalogIsActive(normalizeListResponse(response, 'categories'));
    },
    enabled: !!businessId
  });

  // Fetch payment methods
  const { data: paymentMethods = [], isLoading: loadingPayments } = useQuery({
    queryKey: ['paymentMethods', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const response = await apiClient.get('/protected/payment-methods');
      return normalizeListResponse(response, 'payment_methods').map((method) => {
        const normalizedMethod = withCatalogIsActive(method);
        return {
          ...normalizedMethod,
          type: method.type || method.code,
          is_default: method.is_default ?? method.preferred
        };
      });
    },
    enabled: !!businessId
  });

  // Fetch bank account data
  const { data: bankAccount } = useQuery({
    queryKey: ['bankAccount', businessId],
    queryFn: async () => {
      if (!businessId) return null;
      const response = await apiClient.get('/protected/banks');
      return response?.data ?? response;
    },
    enabled: !!businessId
  });

  // Fetch SMTP config
  const { data: smtpConfig } = useQuery({
    queryKey: ['smtpConfig', businessId],
    queryFn: async () => {
      if (!businessId) return null;
      const response = await apiClient.get('/protected/business/smtp');
      return response?.data || response;
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

  const handleSaveBusiness = async (event) => {
    event?.preventDefault();
    const form = businessFormRef.current;
    if (form && !form.reportValidity()) {
      return;
    }
    if (!currentBusiness) return;
    setSavingBusiness(true);
    try {
      const payload = {
        name: businessData.name,
        address: businessData.address,
        phone: businessData.phone,
        tax_id: businessData.tax_id,
        currency: businessData.currency,
        email: businessData.business_email || undefined
      };
      const updated = await apiClient.put('/protected/business', payload);
      const updatedBusiness = normalizeEntityResponse(updated);
      const mergedBusiness = { ...currentBusiness, ...updatedBusiness };
      selectBusiness(mergedBusiness);
      setBusinessData({
        name: mergedBusiness.name || '',
        business_email: mergedBusiness.email || mergedBusiness.business_email || '',
        address: mergedBusiness.address || '',
        phone: mergedBusiness.phone || '',
        tax_id: mergedBusiness.tax_id || '',
        currency: mergedBusiness.currency || 'ARS'
      });
      toast.success('Business settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSavingBusiness(false);
    }
  };

  const handleSaveCategory = async () => {
    setSavingCategory(true);
    try {
      if (editingCategory) {
        const response = await apiClient.put(`/protected/categories/${editingCategory.id}`, categoryData);
        updateCategoryCache(response);
        toast.success('Category updated');
      } else {
        const response = await apiClient.post('/protected/categories', { ...categoryData, is_active: true });
        updateCategoryCache(response);
        toast.success('Category created');
      }
      queryClient.invalidateQueries({ queryKey: ['categories', businessId] });
      setShowCategoryModal(false);
      setEditingCategory(null);
      setCategoryData({ name: '', color: '#3B82F6', icon: 'Package' });
    } catch (error) {
      toast.error('Failed to save category');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (category) => {
    try {
      const response = await apiClient.delete(`/protected/categories/${category.id}`);
      updateCategoryCache(response);
      queryClient.invalidateQueries({ queryKey: ['categories', businessId] });
      toast.success('Category deleted');
    } catch (error) {
      toast.error('Failed to delete category');
    }
  };

  const handleSavePaymentMethods = async () => {
    setSavingPayments(true);
    try {
      const methods = paymentMethods.reduce((acc, method) => {
        acc[method.id] = !!paymentStates[method.id];
        return acc;
      }, {});
      await apiClient.post('/protected/payment-methods', {
        methods,
        preferred_payment_method_id: defaultPaymentId
      });
      queryClient.invalidateQueries({ queryKey: ['paymentMethods', businessId] });
      toast.success('Payment methods saved');
    } catch (error) {
      toast.error('Failed to save payment methods');
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
      await apiClient.put('/protected/banks', bankData);
      toast.success('Bank account saved');
      queryClient.invalidateQueries({ queryKey: ['bankAccount', businessId] });
    } catch (error) {
      toast.error('Failed to save bank account');
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
        toast.error('Business email is required to send SMTP emails');
        return;
      }
      if (!smtpData.port || Number.isNaN(smtpData.port)) {
        toast.error('SMTP port is required');
        return;
      }
      const payload = {
        ...smtpData,
        from_name: smtpData.from_name?.trim() || currentBusiness?.name || '',
        from_email: smtpData.from_email?.trim() || fallbackEmail
      };
      await apiClient.put('/protected/business/smtp', payload);
      toast.success('SMTP configuration saved');
      queryClient.invalidateQueries({ queryKey: ['smtpConfig', businessId] });
    } catch (error) {
      toast.error('Failed to save SMTP configuration');
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
        toast.error('Add a recipient email to run the SMTP test');
        return;
      }
      const payload = {
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
      const response = await apiClient.post('/protected/business/smtp/test', payload);
      toast.success(response?.message || 'SMTP configuration test successful');
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
    toast.success(`Module ${!modules[moduleKey] ? 'enabled' : 'disabled'}`);
  };

  const handleLogout = () => {
    logout();
  };

  const openEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryData({ 
      name: category.name, 
      color: category.color || '#3B82F6',
      icon: category.icon || 'Package'
    });
    setShowCategoryModal(true);
  };



  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav user={user} onLogout={handleLogout} currentPage="Settings" />
      
      <div className="max-w-4xl mx-auto p-4 lg:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Business Settings</h1>
          <p className="text-slate-500">Manage your business configuration</p>
        </div>

        <Tabs defaultValue="business">
          <TabsList className="mb-6">
            <TabsTrigger value="business" className="gap-2">
              <Store className="w-4 h-4" />
              Business
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2">
              <Tag className="w-4 h-4" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-2">
              <CreditCard className="w-4 h-4" />
              Payment Methods
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-2">
              <Mail className="w-4 h-4" />
              Integrations
            </TabsTrigger>
            <TabsTrigger value="modules" className="gap-2">
              <Package className="w-4 h-4" />
              Modules
            </TabsTrigger>
          </TabsList>

          {/* Business Tab */}
          <TabsContent value="business">
            <Card>
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
                <CardDescription>Update your business details</CardDescription>
              </CardHeader>
              <CardContent>
                <form ref={businessFormRef} className="space-y-4" onSubmit={handleSaveBusiness}>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Business Name</Label>
                      {/* <Input
                        value={businessData.name}
                        onChange={(e) => setBusinessData({ ...businessData, name: e.target.value })}
                      /> */}
                      <Input
                        disabled
                        value={businessData.name}
                        onChange={(e) => setBusinessData({ ...businessData, name: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Business Email</Label>
                      {/* <Input
                        type="email"
                        value={businessData.business_email}
                        onChange={(e) => setBusinessData({ ...businessData, business_email: e.target.value })}
                        placeholder="contact@business.com"
                      /> */}
                      <Input
                        disabled
                        type="email"
                        value={businessData.business_email}
                        onChange={(e) => setBusinessData({ ...businessData, business_email: e.target.value })}
                        placeholder="contact@business.com"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Address</Label>
                      <Input
                        value={businessData.address}
                        onChange={(e) => setBusinessData({ ...businessData, address: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={businessData.phone}
                        onChange={(e) => setBusinessData({ ...businessData, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Tax ID</Label>
                      <Input
                        value={businessData.tax_id}
                        onChange={(e) => setBusinessData({ ...businessData, tax_id: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Currency</Label>
                      <Select 
                        value={businessData.currency} 
                        onValueChange={(v) => setBusinessData({ ...businessData, currency: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ARS">ARS - Argentine Peso</SelectItem>
                          <SelectItem value="USD">USD - US Dollar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button type="submit" disabled={savingBusiness}>
                    {savingBusiness ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Changes
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
                  <CardTitle>Categories</CardTitle>
                  <CardDescription>Organize your items into categories</CardDescription>
                </div>
                <Button onClick={() => { setEditingCategory(null); setCategoryData({ name: '', color: '#3B82F6', icon: 'Package' }); setShowCategoryModal(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Category
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
                     const IconComponent = iconComponents[category.icon] || Package;
                     return (
                       <div key={category.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                         <div className="flex items-center gap-3">
                           <div 
                             className="w-8 h-8 rounded-lg flex items-center justify-center" 
                             style={{ backgroundColor: (category.color || '#3B82F6') + '20' }}
                           >
                             <IconComponent className="w-4 h-4" style={{ color: category.color || '#3B82F6' }} />
                           </div>
                           <span className="font-medium">{category.name}</span>
                           {category.is_active === false && (
                             <Badge variant="secondary">Inactive</Badge>
                           )}
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
          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>Enable or disable payment methods (preset)</CardDescription>
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
                        const isDefaultPayment = method.id === defaultPaymentId
                          || method.is_default
                          || method.preferred;
                        return (
                          <div key={method.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
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
                                <span className="font-medium">{method.name}</span>
                                <p className="text-xs text-slate-500 capitalize">{method.type}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleSetDefaultPayment(method.id)}
                                className={`p-2 rounded transition-colors ${
                                  defaultPaymentId === method.id 
                                    ? 'text-yellow-500 hover:text-yellow-600' 
                                    : 'text-slate-300 hover:text-slate-400'
                                }`}
                                title={defaultPaymentId === method.id ? 'Default payment method' : 'Set as default'}
                              >
                                <Star className="w-5 h-5" fill={defaultPaymentId === method.id ? 'currentColor' : 'none'} />
                              </button>
                              <Switch
                                checked={isCash || isDefaultPayment || paymentStates[method.id] || false}
                                disabled={isCash || isDefaultPayment}
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
                      Save Changes
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bank Account Configuration */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Bank Transfer Configuration</CardTitle>
                <CardDescription>Configure your bank account details for transfer payments</CardDescription>
              </CardHeader>
              <CardContent>
                <form ref={bankFormRef} className="space-y-4" onSubmit={handleSaveBankData}>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Bank Name</Label>
                      <Input
                        value={bankData.bank_name}
                        onChange={(e) => setBankData({ ...bankData, bank_name: e.target.value })}
                        placeholder="e.g., Banco Galicia"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Account Holder</Label>
                      <Input
                        value={bankData.account_holder_name}
                        onChange={(e) => setBankData({ ...bankData, account_holder_name: e.target.value })}
                        placeholder="Account holder name"
                      />
                    </div>
                    <div>
                      <Label>CBU</Label>
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
                          The CBU must be 22 digits or fewer.
                        </p>
                      )}
                    </div>
                    <div>
                      <Label>Alias</Label>
                      <Input
                        value={bankData.alias}
                        onChange={(e) => setBankData({ ...bankData, alias: e.target.value })}
                        placeholder="my.business.alias"
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={savingBank}>
                    {savingBank ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Bank Details
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations">
            <Card>
              <CardHeader>
                <CardTitle>SMTP Configuration</CardTitle>
                <CardDescription>Configure email settings for sending receipts and notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <form ref={smtpFormRef} className="space-y-4" onSubmit={handleSaveSmtp}>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                      <Label>Host</Label>
                      <Input
                        required
                        value={smtpData.host}
                        onChange={(e) => setSmtpData({ ...smtpData, host: e.target.value })}
                        placeholder="smtp.example.com"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <Label>Port</Label>
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
                      <Label>Username</Label>
                      <Input
                        required
                        value={smtpData.username}
                        onChange={(e) => setSmtpData({ ...smtpData, username: e.target.value })}
                        placeholder="user@example.com"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <Label>Password</Label>
                      <Input
                        required={!smtpConfig}
                        type="password"
                        value={smtpData.password}
                        onChange={(e) => setSmtpData({ ...smtpData, password: e.target.value })}
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <Label>Encryption</Label>
                      <Select value={smtpData.encryption} onValueChange={(v) => setSmtpData({ ...smtpData, encryption: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="tls">TLS</SelectItem>
                          <SelectItem value="ssl">SSL</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <Label>From Name</Label>
                      <Input
                        value={smtpData.from_name}
                        onChange={(e) => setSmtpData({ ...smtpData, from_name: e.target.value })}
                        placeholder={currentBusiness?.name || 'My Business'}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>From Email</Label>
                      <Input
                        type="email"
                        value={smtpData.from_email}
                        onChange={(e) => setSmtpData({ ...smtpData, from_email: e.target.value })}
                        placeholder={currentBusiness?.email || currentBusiness?.business_email || 'noreply@example.com'}
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button type="submit" disabled={savingSmtp}>
                      {savingSmtp ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save Configuration
                    </Button>
                    <Button type="button" variant="outline" onClick={handleTestSmtp} disabled={testingSmtp}>
                      {testingSmtp ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <TestTube className="w-4 h-4 mr-2" />
                      )}
                      Test SMTP
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Modules Tab */}
          <TabsContent value="modules">
            <Card>
              <CardHeader>
                <CardTitle>System Modules</CardTitle>
                <CardDescription>Enable or disable additional features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">Inventory Management</p>
                    <p className="text-sm text-slate-500">Track stock levels and receive alerts</p>
                  </div>
                  <Switch
                    checked={modules.inventory}
                    onCheckedChange={() => handleToggleModule('inventory', false)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900">Customer Management</p>
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                        <Lock className="w-3 h-3 mr-1" />
                        Premium
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500">Store customer data and purchase history</p>
                  </div>
                  <Switch
                    checked={modules.customers}
                    onCheckedChange={() => handleToggleModule('customers', true)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900">Invoicing & Billing</p>
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                        <Lock className="w-3 h-3 mr-1" />
                        Premium
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500">Generate invoices and manage billing</p>
                  </div>
                  <Switch
                    checked={modules.invoicing}
                    onCheckedChange={() => handleToggleModule('invoicing', true)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900">Advanced Analytics</p>
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                        <Lock className="w-3 h-3 mr-1" />
                        Premium
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500">Detailed insights and forecasting</p>
                  </div>
                  <Switch
                    checked={modules.analytics}
                    onCheckedChange={() => handleToggleModule('analytics', true)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900">Loyalty Program</p>
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                        <Lock className="w-3 h-3 mr-1" />
                        Premium
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500">Reward customers with points and discounts</p>
                  </div>
                  <Switch
                    checked={modules.loyalty}
                    onCheckedChange={() => handleToggleModule('loyalty', true)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Premium Dialog */}
      <Dialog open={showPremiumDialog} onOpenChange={setShowPremiumDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-600" />
              Premium Feature
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-slate-600">
              This module is only available with the Premium plan. Upgrade now to unlock advanced features and take your business to the next level.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">Premium Plan includes:</p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Customer Management</li>
                <li>• Invoicing & Billing</li>
                <li>• Advanced Analytics</li>
                <li>• Loyalty Program</li>
                <li>• Priority Support</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowPremiumDialog(false)}>
                Cancel
              </Button>
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
                Upgrade to Premium
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Category Modal */}
      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={categoryData.name}
                onChange={(e) => setCategoryData({ ...categoryData, name: e.target.value })}
                placeholder="Category name"
              />
            </div>
            <div>
              <Label>Color</Label>
              <div className="grid grid-cols-6 gap-2 mt-1 max-h-32 overflow-y-auto pr-2">
                {availableColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full ${categoryData.color === color ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setCategoryData({ ...categoryData, color })}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label>Icon</Label>
              <div className="grid grid-cols-5 gap-2 mt-1 max-h-48 overflow-y-auto pr-2">
                {availableIcons.map((iconName) => {
                  const IconComponent = iconComponents[iconName];
                  return (
                    <button
                      key={iconName}
                      type="button"
                      className={`p-2 border rounded-lg hover:bg-slate-50 ${categoryData.icon === iconName ? 'bg-blue-100 border-blue-500' : 'border-slate-200'}`}
                      onClick={() => setCategoryData({ ...categoryData, icon: iconName })}
                    >
                      <IconComponent className="w-5 h-5 mx-auto" />
                    </button>
                  );
                })}
              </div>
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
                  Delete
                </Button>
              )}
              <div className="flex gap-3 ml-auto">
                <Button variant="outline" onClick={() => setShowCategoryModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveCategory} disabled={savingCategory || !categoryData.name}>
                  {savingCategory && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>


    </div>
  );
}
