import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Package, Key, ShoppingBag, LogOut, Plus, Trash2, Edit2, Save, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  price: number;
  duration: string | null;
  available: number | null;
}

interface ProductOption {
  id: string;
  product_id: string;
  name: string;
  price: number;
  duration: string | null;
  available: number | null;
  type: string | null;
  description: string | null;
  estimated_time: string | null;
}

interface Token {
  id: string;
  token: string;
  balance: number;
}

interface Order {
  id: string;
  token_id: string | null;
  product_id: string | null;
  option_id: string | null;
  amount: number;
  status: string;
  created_at: string;
  email: string | null;
  verification_link: string | null;
  response_message: string | null;
}

// Order Card Component with message input
const OrderCard = ({ 
  order, 
  onUpdateStatus, 
  onDelete 
}: { 
  order: Order; 
  onUpdateStatus: (id: string, status: string, message?: string) => void;
  onDelete: (id: string) => void;
}) => {
  const [message, setMessage] = useState(order.response_message || '');
  const [selectedStatus, setSelectedStatus] = useState(order.status);

  const handleSubmit = () => {
    onUpdateStatus(order.id, selectedStatus, message);
  };

  return (
    <div className="card-simple p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-muted-foreground">
              {new Date(order.created_at).toLocaleDateString('ar-EG')} - {new Date(order.created_at).toLocaleTimeString('ar-EG')}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              order.status === 'completed' ? 'bg-green-100 text-green-800' :
              order.status === 'rejected' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {order.status === 'pending' ? 'قيد الانتظار' :
               order.status === 'completed' ? 'مكتمل' :
               order.status === 'rejected' ? 'مرفوض' : order.status}
            </span>
          </div>
          <p className="font-bold">${order.amount}</p>
          {order.email && <p className="text-sm text-muted-foreground">البريد: {order.email}</p>}
          {order.verification_link && (
            <a href={order.verification_link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
              رابط التحقق
            </a>
          )}
        </div>
        <button onClick={() => onDelete(order.id)} className="p-2 hover:bg-red-100 text-red-600 rounded-lg">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3 mt-3 pt-3 border-t border-border">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium whitespace-nowrap">الحالة:</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="input-field text-sm py-2 px-3 min-w-[150px]"
          >
            <option value="pending">قيد الانتظار</option>
            <option value="completed">مكتمل</option>
            <option value="rejected">مرفوض</option>
          </select>
        </div>
        
        <div className="space-y-1">
          <label className="text-sm font-medium block">رسالة للعميل (اختياري):</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="input-field w-full text-sm resize-none"
            rows={3}
            placeholder="اكتب رسالة تظهر للعميل عند تحديث الحالة..."
          />
        </div>

        <button 
          onClick={handleSubmit}
          className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2 font-medium"
        >
          <Save className="w-4 h-4" />
          تحديث الطلب
        </button>
      </div>
    </div>
  );
};

const Admin = () => {
  const [activeTab, setActiveTab] = useState<'products' | 'tokens' | 'orders'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // New product form
  const [newProduct, setNewProduct] = useState({ name: '', price: 0, duration: '', available: 0 });
  const [showNewProduct, setShowNewProduct] = useState(false);

  // New token form
  const [newToken, setNewToken] = useState({ token: '', balance: 0 });
  const [showNewToken, setShowNewToken] = useState(false);

  // Editing token
  const [editingToken, setEditingToken] = useState<string | null>(null);
  const [editTokenForm, setEditTokenForm] = useState<Partial<Token>>({});

  // New option form
  const [newOption, setNewOption] = useState({ name: '', type: 'full_activation', description: '', estimated_time: '' });
  const [showNewOption, setShowNewOption] = useState<string | null>(null);

  // Editing option
  const [editingOption, setEditingOption] = useState<string | null>(null);
  const [editOptionForm, setEditOptionForm] = useState<Partial<ProductOption>>({});

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      fetchData();
    }
  }, [activeTab, isLoading]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      navigate('/admin/auth');
      return;
    }

    const { data: isAdmin, error } = await supabase.rpc('has_role', {
      _user_id: session.user.id,
      _role: 'admin',
    });

    if (error || !isAdmin) {
      await supabase.auth.signOut();
      navigate('/admin/auth');
      return;
    }

    setIsLoading(false);
  };

  const fetchData = async () => {
    if (activeTab === 'products') {
      const { data: productsData } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      const { data: optionsData } = await supabase.from('product_options').select('*');
      setProducts(productsData || []);
      setProductOptions(optionsData || []);
    } else if (activeTab === 'tokens') {
      const { data } = await supabase.from('tokens').select('*').order('created_at', { ascending: false });
      setTokens(data || []);
    } else if (activeTab === 'orders') {
      const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      setOrders(data || []);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/auth');
  };

  // Products
  const handleAddProduct = async () => {
    if (!newProduct.name || newProduct.price <= 0) {
      toast({ title: 'خطأ', description: 'يرجى ملء جميع الحقول', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('products').insert({
      name: newProduct.name,
      price: newProduct.price,
      duration: newProduct.duration || null,
      available: newProduct.available
    });

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: 'تم إضافة المنتج بنجاح' });
      setNewProduct({ name: '', price: 0, duration: '', available: 0 });
      setShowNewProduct(false);
      fetchData();
    }
  };

  const handleDeleteProduct = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: 'تم حذف المنتج' });
      fetchData();
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product.id);
    setEditForm(product);
  };

  const handleSaveProduct = async () => {
    if (!editingProduct) return;

    const { error } = await supabase
      .from('products')
      .update({
        name: editForm.name,
        price: editForm.price,
        duration: editForm.duration,
        available: editForm.available
      })
      .eq('id', editingProduct);

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: 'تم تحديث المنتج' });
      setEditingProduct(null);
      fetchData();
    }
  };

  // Product Options
  const handleAddOption = async (productId: string) => {
    if (!newOption.name) {
      toast({ title: 'خطأ', description: 'يرجى إدخال اسم الخيار', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('product_options').insert([{
      product_id: productId,
      name: newOption.name,
      type: newOption.type,
      description: newOption.description || null,
      estimated_time: newOption.estimated_time || null,
      price: 0
    }]);

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: 'تم إضافة الخيار بنجاح' });
      setNewOption({ name: '', type: 'full_activation', description: '', estimated_time: '' });
      setShowNewOption(null);
      fetchData();
    }
  };

  const handleEditOption = (option: ProductOption) => {
    setEditingOption(option.id);
    setEditOptionForm(option);
  };

  const handleSaveOption = async () => {
    if (!editingOption) return;

    const { error } = await supabase
      .from('product_options')
      .update({
        name: editOptionForm.name,
        type: editOptionForm.type,
        description: editOptionForm.description,
        estimated_time: editOptionForm.estimated_time
      })
      .eq('id', editingOption);

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: 'تم تحديث الخيار' });
      setEditingOption(null);
      fetchData();
    }
  };

  const handleDeleteOption = async (id: string) => {
    const { error } = await supabase.from('product_options').delete().eq('id', id);
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: 'تم حذف الخيار' });
      fetchData();
    }
  };

  // Tokens
  const handleAddToken = async () => {
    if (!newToken.token) {
      toast({ title: 'خطأ', description: 'يرجى إدخال التوكن', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('tokens').insert({
      token: newToken.token,
      balance: newToken.balance
    });

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: 'تم إضافة التوكن بنجاح' });
      setNewToken({ token: '', balance: 0 });
      setShowNewToken(false);
      fetchData();
    }
  };

  const handleEditToken = (token: Token) => {
    setEditingToken(token.id);
    setEditTokenForm(token);
  };

  const handleSaveToken = async () => {
    if (!editingToken) return;

    const { error } = await supabase
      .from('tokens')
      .update({
        token: editTokenForm.token,
        balance: editTokenForm.balance
      })
      .eq('id', editingToken);

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: 'تم تحديث التوكن' });
      setEditingToken(null);
      fetchData();
    }
  };

  const handleDeleteToken = async (id: string) => {
    const { error } = await supabase.from('tokens').delete().eq('id', id);
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: 'تم حذف التوكن' });
      fetchData();
    }
  };

  // Orders
  const handleUpdateOrderStatus = async (id: string, status: string, responseMessage?: string) => {
    const updateData: { status: string; response_message?: string } = { status };
    if (responseMessage !== undefined) {
      updateData.response_message = responseMessage;
    }
    const { error } = await supabase.from('orders').update(updateData).eq('id', id);
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: 'تم تحديث حالة الطلب' });
      fetchData();
    }
  };

  const handleDeleteOrder = async (id: string) => {
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: 'تم حذف الطلب' });
      fetchData();
    }
  };

  const getProductOptions = (productId: string) => {
    return productOptions.filter(opt => opt.product_id === productId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">لوحة التحكم</h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>خروج</span>
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'products' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
            }`}
          >
            <Package className="w-5 h-5" />
            <span>المنتجات</span>
          </button>
          <button
            onClick={() => setActiveTab('tokens')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'tokens' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
            }`}
          >
            <Key className="w-5 h-5" />
            <span>التوكنات</span>
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'orders' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
            }`}
          >
            <ShoppingBag className="w-5 h-5" />
            <span>الطلبات</span>
          </button>
        </div>

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">المنتجات ({products.length})</h2>
              <button
                onClick={() => setShowNewProduct(!showNewProduct)}
                className="btn-primary flex items-center gap-2 px-4 py-2"
              >
                <Plus className="w-5 h-5" />
                <span>إضافة منتج</span>
              </button>
            </div>

            {showNewProduct && (
              <div className="card-simple p-4 space-y-3">
                <input
                  type="text"
                  placeholder="اسم المنتج"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="input-field w-full"
                />
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="number"
                    placeholder="السعر"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 })}
                    className="input-field"
                  />
                  <input
                    type="text"
                    placeholder="المدة"
                    value={newProduct.duration}
                    onChange={(e) => setNewProduct({ ...newProduct, duration: e.target.value })}
                    className="input-field"
                  />
                  <input
                    type="number"
                    placeholder="المتوفر"
                    value={newProduct.available}
                    onChange={(e) => setNewProduct({ ...newProduct, available: parseInt(e.target.value) || 0 })}
                    className="input-field"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAddProduct} className="btn-primary px-4 py-2">حفظ</button>
                  <button onClick={() => setShowNewProduct(false)} className="px-4 py-2 border border-border rounded-lg">إلغاء</button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {products.map((product) => (
                <div key={product.id} className="card-simple overflow-hidden">
                  <div className="p-4">
                    {editingProduct === product.id ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editForm.name || ''}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="input-field w-full"
                        />
                        <div className="grid grid-cols-3 gap-3">
                          <input
                            type="number"
                            value={editForm.price || 0}
                            onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) || 0 })}
                            className="input-field"
                          />
                          <input
                            type="text"
                            value={editForm.duration || ''}
                            onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })}
                            className="input-field"
                          />
                          <input
                            type="number"
                            value={editForm.available || 0}
                            onChange={(e) => setEditForm({ ...editForm, available: parseInt(e.target.value) || 0 })}
                            className="input-field"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleSaveProduct} className="btn-primary px-3 py-1 flex items-center gap-1">
                            <Save className="w-4 h-4" /> حفظ
                          </button>
                          <button onClick={() => setEditingProduct(null)} className="px-3 py-1 border border-border rounded-lg flex items-center gap-1">
                            <X className="w-4 h-4" /> إلغاء
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold">{product.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            ${product.price} • {product.duration} • متوفر: {product.available}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}
                            className="p-2 hover:bg-muted rounded-lg"
                            title="خيارات المنتج"
                          >
                            {expandedProduct === product.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          <button onClick={() => handleEditProduct(product)} className="p-2 hover:bg-muted rounded-lg">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteProduct(product.id)} className="p-2 hover:bg-red-100 text-red-600 rounded-lg">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Product Options */}
                  {expandedProduct === product.id && (
                    <div className="border-t border-border bg-muted/30 p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium text-sm">خيارات المنتج</h4>
                        <button
                          onClick={() => setShowNewOption(showNewOption === product.id ? null : product.id)}
                          className="text-primary text-sm flex items-center gap-1"
                        >
                          <Plus className="w-4 h-4" /> إضافة خيار
                        </button>
                      </div>

                      {showNewOption === product.id && (
                        <div className="bg-background p-3 rounded-lg space-y-2">
                          <input
                            type="text"
                            placeholder="اسم الخيار"
                            value={newOption.name}
                            onChange={(e) => setNewOption({ ...newOption, name: e.target.value })}
                            className="input-field w-full text-sm"
                          />
                          <select
                            value={newOption.type}
                            onChange={(e) => setNewOption({ ...newOption, type: e.target.value })}
                            className="input-field w-full text-sm"
                          >
                            <option value="full_activation">تفعيل كامل</option>
                            <option value="student_verification">تخطي تحقق الطالب</option>
                          </select>
                          <input
                            type="text"
                            placeholder="الوصف"
                            value={newOption.description}
                            onChange={(e) => setNewOption({ ...newOption, description: e.target.value })}
                            className="input-field w-full text-sm"
                          />
                          <input
                            type="text"
                            placeholder="الوقت المتوقع"
                            value={newOption.estimated_time}
                            onChange={(e) => setNewOption({ ...newOption, estimated_time: e.target.value })}
                            className="input-field w-full text-sm"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => handleAddOption(product.id)} className="btn-primary px-3 py-1 text-sm">حفظ</button>
                            <button onClick={() => setShowNewOption(null)} className="px-3 py-1 text-sm border border-border rounded-lg">إلغاء</button>
                          </div>
                        </div>
                      )}

                      {getProductOptions(product.id).length === 0 ? (
                        <p className="text-sm text-muted-foreground">لا توجد خيارات</p>
                      ) : (
                        <div className="space-y-2">
                          {getProductOptions(product.id).map((option) => (
                            <div key={option.id} className="bg-background p-3 rounded-lg">
                              {editingOption === option.id ? (
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    value={editOptionForm.name || ''}
                                    onChange={(e) => setEditOptionForm({ ...editOptionForm, name: e.target.value })}
                                    className="input-field w-full text-sm"
                                  />
                                  <select
                                    value={editOptionForm.type || ''}
                                    onChange={(e) => setEditOptionForm({ ...editOptionForm, type: e.target.value })}
                                    className="input-field w-full text-sm"
                                  >
                                    <option value="full_activation">تفعيل كامل</option>
                                    <option value="student_verification">تخطي تحقق الطالب</option>
                                  </select>
                                  <input
                                    type="text"
                                    value={editOptionForm.description || ''}
                                    onChange={(e) => setEditOptionForm({ ...editOptionForm, description: e.target.value })}
                                    className="input-field w-full text-sm"
                                    placeholder="الوصف"
                                  />
                                  <input
                                    type="text"
                                    value={editOptionForm.estimated_time || ''}
                                    onChange={(e) => setEditOptionForm({ ...editOptionForm, estimated_time: e.target.value })}
                                    className="input-field w-full text-sm"
                                    placeholder="الوقت المتوقع"
                                  />
                                  <div className="flex gap-2">
                                    <button onClick={handleSaveOption} className="btn-primary px-2 py-1 text-xs flex items-center gap-1">
                                      <Save className="w-3 h-3" /> حفظ
                                    </button>
                                    <button onClick={() => setEditingOption(null)} className="px-2 py-1 text-xs border border-border rounded-lg">إلغاء</button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium text-sm">{option.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {option.type === 'full_activation' ? 'تفعيل كامل' : 'تخطي تحقق الطالب'}
                                      {option.estimated_time && ` • ${option.estimated_time}`}
                                    </p>
                                    {option.description && <p className="text-xs text-muted-foreground mt-1">{option.description}</p>}
                                  </div>
                                  <div className="flex gap-1">
                                    <button onClick={() => handleEditOption(option)} className="p-1.5 hover:bg-muted rounded">
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button onClick={() => handleDeleteOption(option.id)} className="p-1.5 hover:bg-red-100 text-red-600 rounded">
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tokens Tab */}
        {activeTab === 'tokens' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">التوكنات ({tokens.length})</h2>
              <button
                onClick={() => setShowNewToken(!showNewToken)}
                className="btn-primary flex items-center gap-2 px-4 py-2"
              >
                <Plus className="w-5 h-5" />
                <span>إضافة توكن</span>
              </button>
            </div>

            {showNewToken && (
              <div className="card-simple p-4 space-y-3">
                <input
                  type="text"
                  placeholder="التوكن"
                  value={newToken.token}
                  onChange={(e) => setNewToken({ ...newToken, token: e.target.value })}
                  className="input-field w-full"
                />
                <input
                  type="number"
                  placeholder="الرصيد"
                  value={newToken.balance}
                  onChange={(e) => setNewToken({ ...newToken, balance: parseFloat(e.target.value) || 0 })}
                  className="input-field w-full"
                />
                <div className="flex gap-2">
                  <button onClick={handleAddToken} className="btn-primary px-4 py-2">حفظ</button>
                  <button onClick={() => setShowNewToken(false)} className="px-4 py-2 border border-border rounded-lg">إلغاء</button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {tokens.map((token) => (
                <div key={token.id} className="card-simple p-4">
                  {editingToken === token.id ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editTokenForm.token || ''}
                        onChange={(e) => setEditTokenForm({ ...editTokenForm, token: e.target.value })}
                        className="input-field w-full font-mono"
                      />
                      <input
                        type="number"
                        value={editTokenForm.balance || 0}
                        onChange={(e) => setEditTokenForm({ ...editTokenForm, balance: parseFloat(e.target.value) || 0 })}
                        className="input-field w-full"
                      />
                      <div className="flex gap-2">
                        <button onClick={handleSaveToken} className="btn-primary px-3 py-1 flex items-center gap-1">
                          <Save className="w-4 h-4" /> حفظ
                        </button>
                        <button onClick={() => setEditingToken(null)} className="px-3 py-1 border border-border rounded-lg flex items-center gap-1">
                          <X className="w-4 h-4" /> إلغاء
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-mono font-bold">{token.token}</h3>
                        <p className="text-sm text-muted-foreground">الرصيد: ${token.balance}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleEditToken(token)} className="p-2 hover:bg-muted rounded-lg">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteToken(token.id)} className="p-2 hover:bg-red-100 text-red-600 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">الطلبات ({orders.length})</h2>

            <div className="space-y-3">
              {orders.map((order) => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  onUpdateStatus={handleUpdateOrderStatus}
                  onDelete={handleDeleteOrder}
                />
              ))}
              {orders.length === 0 && (
                <p className="text-center text-muted-foreground py-8">لا توجد طلبات</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
