import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  Package, Key, ShoppingCart, Plus, Trash2, Edit2, LogOut, 
  Loader2, Check, X, Sparkles, RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Product, ProductOption, Token, Order } from '@/types/services';

type Tab = 'products' | 'tokens' | 'orders';

const Admin = () => {
  const [activeTab, setActiveTab] = useState<Tab>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Form states
  const [showProductForm, setShowProductForm] = useState(false);
  const [showTokenForm, setShowTokenForm] = useState(false);
  const [showOptionForm, setShowOptionForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProductForOption, setSelectedProductForOption] = useState<string>('');

  // Product form
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productImage, setProductImage] = useState('');

  // Option form
  const [optionName, setOptionName] = useState('');
  const [optionPrice, setOptionPrice] = useState('');
  const [optionDuration, setOptionDuration] = useState('');
  const [optionAvailable, setOptionAvailable] = useState('');

  // Token form
  const [tokenValue, setTokenValue] = useState('');
  const [tokenBalance, setTokenBalance] = useState('');

  useEffect(() => {
    checkAuth();
    fetchAllData();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/admin-auth');
    }
  };

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [productsRes, optionsRes, tokensRes, ordersRes] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('product_options').select('*'),
        supabase.from('tokens').select('*').order('created_at', { ascending: false }),
        supabase.from('orders').select('*').order('created_at', { ascending: false })
      ]);

      setProducts(productsRes.data || []);
      setProductOptions(optionsRes.data || []);
      setTokens(tokensRes.data || []);
      setOrders(ordersRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin-auth');
  };

  const handleAddProduct = async () => {
    if (!productName.trim()) return;

    try {
      const { error } = await supabase.from('products').insert({
        name: productName,
        description: productDescription || null,
        image: productImage || null
      });

      if (error) throw error;

      toast({ title: "تم إضافة المنتج بنجاح" });
      resetProductForm();
      fetchAllData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct || !productName.trim()) return;

    try {
      const { error } = await supabase.from('products')
        .update({
          name: productName,
          description: productDescription || null,
          image: productImage || null
        })
        .eq('id', editingProduct.id);

      if (error) throw error;

      toast({ title: "تم تحديث المنتج بنجاح" });
      resetProductForm();
      fetchAllData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;

    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "تم حذف المنتج" });
      fetchAllData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const handleAddOption = async () => {
    if (!selectedProductForOption || !optionName.trim() || !optionPrice) return;

    try {
      const { error } = await supabase.from('product_options').insert({
        product_id: selectedProductForOption,
        name: optionName,
        price: parseFloat(optionPrice),
        duration: optionDuration || null,
        available: optionAvailable ? parseInt(optionAvailable) : 0
      });

      if (error) throw error;

      toast({ title: "تم إضافة الباقة بنجاح" });
      resetOptionForm();
      fetchAllData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteOption = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الباقة؟')) return;

    try {
      const { error } = await supabase.from('product_options').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "تم حذف الباقة" });
      fetchAllData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const handleAddToken = async () => {
    if (!tokenValue.trim() || !tokenBalance) return;

    try {
      const { error } = await supabase.from('tokens').insert({
        token: tokenValue,
        balance: parseFloat(tokenBalance)
      });

      if (error) throw error;

      toast({ title: "تم إضافة التوكن بنجاح" });
      resetTokenForm();
      fetchAllData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteToken = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا التوكن؟')) return;

    try {
      const { error } = await supabase.from('tokens').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "تم حذف التوكن" });
      fetchAllData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const handleUpdateOrderStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase.from('orders')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      toast({ title: "تم تحديث حالة الطلب" });
      fetchAllData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const resetProductForm = () => {
    setShowProductForm(false);
    setEditingProduct(null);
    setProductName('');
    setProductDescription('');
    setProductImage('');
  };

  const resetOptionForm = () => {
    setShowOptionForm(false);
    setSelectedProductForOption('');
    setOptionName('');
    setOptionPrice('');
    setOptionDuration('');
    setOptionAvailable('');
  };

  const resetTokenForm = () => {
    setShowTokenForm(false);
    setTokenValue('');
    setTokenBalance('');
  };

  const startEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductName(product.name);
    setProductDescription(product.description || '');
    setProductImage(product.image || '');
    setShowProductForm(true);
  };

  const getProductName = (productId: string | null) => {
    if (!productId) return '-';
    const product = products.find(p => p.id === productId);
    return product?.name || '-';
  };

  const getOptionName = (optionId: string | null) => {
    if (!optionId) return '-';
    const option = productOptions.find(o => o.id === optionId);
    return option?.name || '-';
  };

  const getProductOptions = (productId: string) => {
    return productOptions.filter(opt => opt.product_id === productId);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="glass-effect sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold text-foreground">لوحة التحكم</h1>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={fetchAllData}
                className="nav-btn bg-secondary text-secondary-foreground hover:bg-secondary/80"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button 
                onClick={handleLogout}
                className="nav-btn bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">خروج</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'products' as Tab, label: 'المنتجات', icon: Package },
            { id: 'tokens' as Tab, label: 'التوكنات', icon: Key },
            { id: 'orders' as Tab, label: 'الطلبات', icon: ShoppingCart },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`nav-btn flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-card text-foreground hover:bg-secondary'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Products Tab */}
            {activeTab === 'products' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold text-foreground">المنتجات ({products.length})</h2>
                  <button
                    onClick={() => setShowProductForm(true)}
                    className="btn-primary px-4 py-2 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة منتج</span>
                  </button>
                </div>

                {showProductForm && (
                  <div className="bg-card rounded-xl p-4 shadow-sm animate-fade-in">
                    <h3 className="font-bold text-foreground mb-4">
                      {editingProduct ? 'تعديل المنتج' : 'إضافة منتج جديد'}
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <input
                        type="text"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder="اسم المنتج"
                        className="input-field"
                      />
                      <input
                        type="text"
                        value={productImage}
                        onChange={(e) => setProductImage(e.target.value)}
                        placeholder="رابط الصورة (اختياري)"
                        className="input-field"
                        dir="ltr"
                      />
                      <textarea
                        value={productDescription}
                        onChange={(e) => setProductDescription(e.target.value)}
                        placeholder="الوصف (اختياري)"
                        className="input-field md:col-span-2"
                        rows={2}
                      />
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={editingProduct ? handleUpdateProduct : handleAddProduct}
                        className="btn-primary px-4 py-2"
                      >
                        {editingProduct ? 'تحديث' : 'إضافة'}
                      </button>
                      <button onClick={resetProductForm} className="btn-secondary px-4 py-2">
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}

                {showOptionForm && (
                  <div className="bg-card rounded-xl p-4 shadow-sm animate-fade-in">
                    <h3 className="font-bold text-foreground mb-4">إضافة باقة جديدة</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <select
                        value={selectedProductForOption}
                        onChange={(e) => setSelectedProductForOption(e.target.value)}
                        className="input-field"
                      >
                        <option value="">اختر المنتج</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={optionName}
                        onChange={(e) => setOptionName(e.target.value)}
                        placeholder="اسم الباقة"
                        className="input-field"
                      />
                      <input
                        type="number"
                        value={optionPrice}
                        onChange={(e) => setOptionPrice(e.target.value)}
                        placeholder="السعر"
                        className="input-field"
                        dir="ltr"
                      />
                      <input
                        type="text"
                        value={optionDuration}
                        onChange={(e) => setOptionDuration(e.target.value)}
                        placeholder="المدة (مثال: شهر، سنة)"
                        className="input-field"
                      />
                      <input
                        type="number"
                        value={optionAvailable}
                        onChange={(e) => setOptionAvailable(e.target.value)}
                        placeholder="الكمية المتاحة"
                        className="input-field"
                        dir="ltr"
                      />
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button onClick={handleAddOption} className="btn-primary px-4 py-2">
                        إضافة
                      </button>
                      <button onClick={resetOptionForm} className="btn-secondary px-4 py-2">
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid gap-4">
                  {products.map(product => (
                    <div key={product.id} className="bg-card rounded-xl p-4 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {product.image ? (
                            <img 
                              src={product.image} 
                              alt={product.name}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Package className="w-6 h-6 text-primary" />
                            </div>
                          )}
                          <div>
                            <h3 className="font-bold text-foreground">{product.name}</h3>
                            {product.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {product.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => startEditProduct(product)}
                            className="p-2 text-muted-foreground hover:text-foreground"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="p-2 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Product Options */}
                      <div className="border-t border-border pt-3 mt-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-muted-foreground">الباقات</span>
                          <button
                            onClick={() => {
                              setSelectedProductForOption(product.id);
                              setShowOptionForm(true);
                            }}
                            className="text-xs text-primary hover:underline"
                          >
                            + إضافة باقة
                          </button>
                        </div>
                        {getProductOptions(product.id).length === 0 ? (
                          <p className="text-sm text-muted-foreground">لا توجد باقات</p>
                        ) : (
                          <div className="space-y-2">
                            {getProductOptions(product.id).map(option => (
                              <div 
                                key={option.id}
                                className="flex items-center justify-between p-2 bg-secondary/50 rounded-lg"
                              >
                                <div>
                                  <span className="text-sm font-medium text-foreground">
                                    {option.name}
                                  </span>
                                  {option.duration && (
                                    <span className="text-xs text-muted-foreground mr-2">
                                      ({option.duration})
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-primary">
                                    {option.price} ر.س
                                  </span>
                                  <button
                                    onClick={() => handleDeleteOption(option.id)}
                                    className="p-1 text-muted-foreground hover:text-destructive"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tokens Tab */}
            {activeTab === 'tokens' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold text-foreground">التوكنات ({tokens.length})</h2>
                  <button
                    onClick={() => setShowTokenForm(true)}
                    className="btn-primary px-4 py-2 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة توكن</span>
                  </button>
                </div>

                {showTokenForm && (
                  <div className="bg-card rounded-xl p-4 shadow-sm animate-fade-in">
                    <h3 className="font-bold text-foreground mb-4">إضافة توكن جديد</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <input
                        type="text"
                        value={tokenValue}
                        onChange={(e) => setTokenValue(e.target.value)}
                        placeholder="قيمة التوكن"
                        className="input-field"
                        dir="ltr"
                      />
                      <input
                        type="number"
                        value={tokenBalance}
                        onChange={(e) => setTokenBalance(e.target.value)}
                        placeholder="الرصيد"
                        className="input-field"
                        dir="ltr"
                      />
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button onClick={handleAddToken} className="btn-primary px-4 py-2">
                        إضافة
                      </button>
                      <button onClick={resetTokenForm} className="btn-secondary px-4 py-2">
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-card rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-secondary/50">
                        <tr>
                          <th className="px-4 py-3 text-right text-sm font-medium text-foreground">التوكن</th>
                          <th className="px-4 py-3 text-right text-sm font-medium text-foreground">الرصيد</th>
                          <th className="px-4 py-3 text-right text-sm font-medium text-foreground">تاريخ الإنشاء</th>
                          <th className="px-4 py-3 text-right text-sm font-medium text-foreground">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {tokens.map(token => (
                          <tr key={token.id}>
                            <td className="px-4 py-3 font-mono text-sm text-foreground" dir="ltr">
                              {token.token}
                            </td>
                            <td className="px-4 py-3 text-sm font-bold text-primary">
                              {token.balance} ر.س
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {new Date(token.created_at).toLocaleDateString('ar')}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => handleDeleteToken(token.id)}
                                className="p-2 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-foreground">الطلبات ({orders.length})</h2>

                <div className="bg-card rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-secondary/50">
                        <tr>
                          <th className="px-4 py-3 text-right text-sm font-medium text-foreground">المنتج</th>
                          <th className="px-4 py-3 text-right text-sm font-medium text-foreground">الباقة</th>
                          <th className="px-4 py-3 text-right text-sm font-medium text-foreground">المبلغ</th>
                          <th className="px-4 py-3 text-right text-sm font-medium text-foreground">الحالة</th>
                          <th className="px-4 py-3 text-right text-sm font-medium text-foreground">التاريخ</th>
                          <th className="px-4 py-3 text-right text-sm font-medium text-foreground">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {orders.map(order => (
                          <tr key={order.id}>
                            <td className="px-4 py-3 text-sm text-foreground">
                              {getProductName(order.product_id)}
                            </td>
                            <td className="px-4 py-3 text-sm text-foreground">
                              {getOptionName(order.option_id)}
                            </td>
                            <td className="px-4 py-3 text-sm font-bold text-primary">
                              {order.amount} ر.س
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                order.status === 'completed' ? 'status-success' :
                                order.status === 'pending' ? 'status-pending' :
                                'status-failed'
                              }`}>
                                {order.status === 'completed' ? 'مكتمل' :
                                 order.status === 'pending' ? 'قيد الانتظار' : 'ملغي'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString('ar')}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1">
                                {order.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => handleUpdateOrderStatus(order.id, 'completed')}
                                      className="p-2 text-success hover:bg-success/10 rounded"
                                      title="إكمال"
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')}
                                      className="p-2 text-destructive hover:bg-destructive/10 rounded"
                                      title="إلغاء"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Admin;
