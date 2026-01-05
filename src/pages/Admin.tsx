import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  Package, Key, ShoppingBag, LogOut, Plus, Trash2, Edit2, Save, X, 
  ChevronDown, ChevronUp, Settings, Copy, Eye, EyeOff, Clock, CheckCircle2,
  XCircle, Loader2, LayoutGrid, Zap, Database
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  price: number;
  duration: string | null;
  available: number | null;
  instant_delivery?: boolean;
}

interface StockItem {
  id: string;
  product_id: string | null;
  option_id: string | null;
  content: string;
  is_sold: boolean;
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
  password: string | null;
  verification_link: string | null;
  response_message: string | null;
}

// Status options
const statusOptions = [
  { value: 'pending', label: 'قيد الانتظار', icon: Clock, color: 'text-warning' },
  { value: 'in_progress', label: 'قيد التنفيذ', icon: Loader2, color: 'text-info' },
  { value: 'completed', label: 'مكتمل', icon: CheckCircle2, color: 'text-success' },
  { value: 'rejected', label: 'مرفوض', icon: XCircle, color: 'text-destructive' },
];

// Order Card Component
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
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const handleSubmit = () => {
    onUpdateStatus(order.id, selectedStatus, message);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'تم النسخ', description: `تم نسخ ${label}` });
  };

  const getStatusInfo = (status: string) => {
    return statusOptions.find(s => s.value === status) || statusOptions[0];
  };

  const statusInfo = getStatusInfo(order.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow">
      {/* Status Header */}
      <div className={`px-4 py-2 flex items-center justify-between ${
        order.status === 'pending' ? 'bg-warning/10' :
        order.status === 'in_progress' ? 'bg-info/10' :
        order.status === 'completed' ? 'bg-success/10' :
        'bg-destructive/10'
      }`}>
        <div className="flex items-center gap-2">
          <StatusIcon className={`w-4 h-4 ${statusInfo.color} ${order.status === 'in_progress' ? 'animate-spin' : ''}`} />
          <span className={`text-sm font-semibold ${statusInfo.color}`}>{statusInfo.label}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {new Date(order.created_at).toLocaleDateString('ar-EG')} - {new Date(order.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Amount & Info */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xl font-bold text-primary">${order.amount}</span>
          
          {order.email && (
            <div className="flex items-center gap-1 bg-muted px-3 py-1.5 rounded-lg">
              <span className="text-sm">{order.email}</span>
              <button onClick={() => copyToClipboard(order.email!, 'الإيميل')} className="p-1 hover:bg-background rounded">
                <Copy className="w-3 h-3" />
              </button>
            </div>
          )}
          
          {order.password && (
            <div className="flex items-center gap-1 bg-muted px-3 py-1.5 rounded-lg">
              <span className="text-sm font-mono">{showPassword ? order.password : '••••••••'}</span>
              <button onClick={() => setShowPassword(!showPassword)} className="p-1 hover:bg-background rounded">
                {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </button>
              <button onClick={() => copyToClipboard(order.password!, 'الباسورد')} className="p-1 hover:bg-background rounded">
                <Copy className="w-3 h-3" />
              </button>
            </div>
          )}

          {order.verification_link && (
            <a 
              href={order.verification_link} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              رابط التحقق ↗
            </a>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="input-field text-sm py-2.5 min-w-[180px]"
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="input-field text-sm py-2.5 flex-1"
            placeholder="رسالة للعميل (اختياري)..."
          />

          <div className="flex gap-2">
            <button onClick={handleSubmit} className="btn-primary px-4 py-2.5 flex items-center gap-2">
              <Save className="w-4 h-4" />
              <span>حفظ</span>
            </button>
            <button onClick={() => onDelete(order.id)} className="p-2.5 border border-destructive/30 text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Product Card Component
const ProductCard = ({
  product,
  options,
  stockCount,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onAddOption,
  onEditOption,
  onDeleteOption,
  onManageStock,
  onManageOptionStock,
  getOptionStockCount,
}: {
  product: Product;
  options: ProductOption[];
  stockCount: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddOption: () => void;
  onEditOption: (option: ProductOption) => void;
  onDeleteOption: (id: string) => void;
  onManageStock: () => void;
  onManageOptionStock: (optionId: string) => void;
  getOptionStockCount: (optionId: string) => number;
}) => {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg truncate">{product.name}</h3>
              {product.instant_delivery && (
                <span className="bg-success/20 text-success px-2 py-0.5 rounded-md text-xs font-medium flex items-center gap-1">
                  <Zap className="w-3 h-3" /> استلام فوري
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
              {product.price > 0 && (
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md font-medium">${product.price}</span>
              )}
              {product.duration && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {product.duration}
                </span>
              )}
              {product.instant_delivery ? (
                <span className="flex items-center gap-1 text-success">
                  <Database className="w-3 h-3" /> المخزون: {stockCount}
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Package className="w-3 h-3" /> متوفر: {product.available || 0}
                </span>
              )}
              <span className="flex items-center gap-1 text-primary">
                <Settings className="w-3 h-3" /> {options.length} خيارات
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {product.instant_delivery && (
              <button
                onClick={onManageStock}
                className="p-2 hover:bg-success/10 text-success rounded-lg transition-colors"
                title="إدارة المخزون"
              >
                <Database className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onToggleExpand}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title="خيارات المنتج"
            >
              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            <button onClick={onEdit} className="p-2 hover:bg-muted rounded-lg transition-colors">
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={onDelete} className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Options Section */}
      {isExpanded && (
        <div className="border-t border-border bg-muted/30">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" />
                المنتجات ({options.length})
              </h4>
              <button
                onClick={onAddOption}
                className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 font-medium"
              >
                <Plus className="w-4 h-4" /> إضافة منتج
              </button>
            </div>

            {options.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">لا توجد منتجات - اضغط على "إضافة منتج" لإنشاء منتج جديد</p>
              </div>
            ) : (
              <div className="grid gap-2">
                {options.map((option) => (
                  <div key={option.id} className="bg-card p-3 rounded-lg border border-border flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{option.name}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="bg-secondary px-2 py-0.5 rounded">
                          {option.type === 'none' ? 'استلام فوري' : option.type === 'email_password' ? 'إيميل وباسورد' : option.type === 'link' ? 'رابط فقط' : option.type === 'text' ? 'نص' : 'استلام فوري'}
                        </span>
                        {option.price > 0 && (
                          <span className="text-primary font-medium">${option.price}</span>
                        )}
                        {option.estimated_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {option.estimated_time}
                          </span>
                        )}
                        {product.instant_delivery && (
                          <span className="flex items-center gap-1 text-success">
                            <Database className="w-3 h-3" /> مخزون: {getOptionStockCount(option.id)}
                          </span>
                        )}
                      </div>
                      {option.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{option.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {product.instant_delivery && (
                        <button
                          onClick={() => onManageOptionStock(option.id)}
                          className="p-1.5 hover:bg-success/10 text-success rounded transition-colors"
                          title="إدارة مخزون هذا المنتج"
                        >
                          <Database className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => onEditOption(option)} className="p-1.5 hover:bg-muted rounded transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => onDeleteOption(option.id)} className="p-1.5 hover:bg-destructive/10 text-destructive rounded transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Admin = () => {
  const [activeTab, setActiveTab] = useState<'products' | 'tokens' | 'orders'>('orders');
  const [products, setProducts] = useState<Product[]>([]);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [showOptionModal, setShowOptionModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  
  // Editing states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingOption, setEditingOption] = useState<ProductOption | null>(null);
  const [editingToken, setEditingToken] = useState<Token | null>(null);
  const [currentProductId, setCurrentProductId] = useState<string | null>(null);

  // Form states
  const [productForm, setProductForm] = useState({ name: '', price: 0, duration: '', available: 0, instant_delivery: false });
  const [optionForm, setOptionForm] = useState({ name: '', type: 'email_password', description: '', estimated_time: '', price: 0, duration: '', delivery_type: 'manual' });
  const [tokenForm, setTokenForm] = useState({ token: '', balance: 0 });
  
  // New options to add with product
  const [newProductOptions, setNewProductOptions] = useState<Array<{ name: string; price: number; description: string; estimated_time: string; input_type: string; duration: string; delivery_type: string; stock_content: string }>>([]);
  
  // Stock items for instant delivery
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [newStockItems, setNewStockItems] = useState<string>('');
  const [showStockModal, setShowStockModal] = useState(false);
  const [currentStockProductId, setCurrentStockProductId] = useState<string | null>(null);
  const [currentStockOptionId, setCurrentStockOptionId] = useState<string | null>(null);

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
      const { data: stockData } = await supabase.from('stock_items').select('*').eq('is_sold', false);
      setProducts(productsData || []);
      setProductOptions(optionsData || []);
      setStockItems(stockData || []);
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

  // Product handlers
  const openProductModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        price: product.price,
        duration: product.duration || '',
        available: product.available || 0,
        instant_delivery: product.instant_delivery || false
      });
      setNewProductOptions([]);
      setNewStockItems('');
    } else {
      setEditingProduct(null);
      setProductForm({ name: '', price: 0, duration: '', available: 0, instant_delivery: false });
      setNewProductOptions([]);
      setNewStockItems('');
    }
    setShowProductModal(true);
  };

  const addNewProductOption = () => {
    setNewProductOptions([...newProductOptions, { name: '', price: 0, description: '', estimated_time: '', input_type: 'none', duration: '', delivery_type: 'manual', stock_content: '' }]);
  };

  const updateNewProductOption = (index: number, field: string, value: string | number) => {
    const updated = [...newProductOptions];
    updated[index] = { ...updated[index], [field]: value };
    setNewProductOptions(updated);
  };

  const removeNewProductOption = (index: number) => {
    setNewProductOptions(newProductOptions.filter((_, i) => i !== index));
  };

  const handleSaveProduct = async () => {
    if (!productForm.name) {
      toast({ title: 'خطأ', description: 'يرجى إدخال اسم المنتج', variant: 'destructive' });
      return;
    }

    if (editingProduct) {
      const { error } = await supabase
        .from('products')
        .update({
          name: productForm.name,
          price: productForm.price,
          duration: productForm.duration || null,
          available: productForm.available,
          instant_delivery: productForm.instant_delivery
        })
        .eq('id', editingProduct.id);

      if (error) {
        toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'تم', description: 'تم تحديث المنتج بنجاح' });
      }
    } else {
      // Create product first
      const { data: newProduct, error: productError } = await supabase
        .from('products')
        .insert({
          name: productForm.name,
          price: productForm.price,
          duration: productForm.duration || null,
          available: productForm.available,
          instant_delivery: productForm.instant_delivery
        })
        .select('id')
        .single();

      if (productError || !newProduct) {
        toast({ title: 'خطأ', description: productError?.message || 'فشل في إضافة المنتج', variant: 'destructive' });
        return;
      }

      // Add options if any
      if (newProductOptions.length > 0) {
        for (const opt of newProductOptions.filter(o => o.name.trim())) {
          // Insert the option
          const { data: insertedOption, error: optError } = await supabase.from('product_options').insert({
            product_id: newProduct.id,
            name: opt.name,
            type: opt.delivery_type === 'auto' ? 'none' : (opt.input_type || 'email_password'),
            description: opt.description || null,
            estimated_time: opt.estimated_time || null,
            price: opt.price || 0,
            duration: opt.duration || null
          }).select('id').single();

          if (optError || !insertedOption) {
            toast({ title: 'تحذير', description: 'فشل في إضافة بعض المنتجات', variant: 'destructive' });
            continue;
          }

          // If auto delivery, add stock items for this option
          if (opt.delivery_type === 'auto' && opt.stock_content.trim()) {
            const items = opt.stock_content.split('\n').filter(item => item.trim());
            if (items.length > 0) {
              const stockToInsert = items.map(content => ({
                product_id: newProduct.id,
                option_id: insertedOption.id,
                content: content.trim(),
                is_sold: false
              }));
              await supabase.from('stock_items').insert(stockToInsert);
            }
          }
        }
      }

      toast({ title: 'تم', description: 'تم إضافة المنتج بنجاح' });
    }

    setShowProductModal(false);
    setNewProductOptions([]);
    fetchData();
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

  // Option handlers
  const openOptionModal = (productId: string, option?: ProductOption) => {
    setCurrentProductId(productId);
    if (option) {
      setEditingOption(option);
      const isAuto = option.type === 'none';
      setOptionForm({
        name: option.name,
        type: option.type || 'email_password',
        description: option.description || '',
        estimated_time: option.estimated_time || '',
        price: option.price || 0,
        duration: option.duration || '',
        delivery_type: isAuto ? 'auto' : 'manual'
      });
    } else {
      setEditingOption(null);
      setOptionForm({ name: '', type: 'none', description: '', estimated_time: '', price: 0, duration: '', delivery_type: 'manual' });
    }
    setShowOptionModal(true);
  };

  const handleSaveOption = async () => {
    if (!optionForm.name || !currentProductId) {
      toast({ title: 'خطأ', description: 'يرجى إدخال اسم الخيار', variant: 'destructive' });
      return;
    }

    const typeToSave = optionForm.delivery_type === 'auto' ? 'none' : optionForm.type;

    if (editingOption) {
      const { error } = await supabase
        .from('product_options')
        .update({
          name: optionForm.name,
          type: typeToSave,
          description: optionForm.description || null,
          estimated_time: optionForm.estimated_time || null,
          price: optionForm.price || 0,
          duration: optionForm.duration || null
        })
        .eq('id', editingOption.id);

      if (error) {
        toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'تم', description: 'تم تحديث المنتج بنجاح' });
      }
    } else {
      const { error } = await supabase.from('product_options').insert({
        product_id: currentProductId,
        name: optionForm.name,
        type: typeToSave,
        description: optionForm.description || null,
        estimated_time: optionForm.estimated_time || null,
        price: optionForm.price || 0,
        duration: optionForm.duration || null
      });

      if (error) {
        toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'تم', description: 'تم إضافة المنتج بنجاح' });
      }
    }

    setShowOptionModal(false);
    fetchData();
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

  // Token handlers
  const openTokenModal = (token?: Token) => {
    if (token) {
      setEditingToken(token);
      setTokenForm({ token: token.token, balance: token.balance });
    } else {
      setEditingToken(null);
      setTokenForm({ token: '', balance: 0 });
    }
    setShowTokenModal(true);
  };

  const handleSaveToken = async () => {
    if (!tokenForm.token) {
      toast({ title: 'خطأ', description: 'يرجى إدخال التوكن', variant: 'destructive' });
      return;
    }

    if (editingToken) {
      const { error } = await supabase
        .from('tokens')
        .update({ token: tokenForm.token, balance: tokenForm.balance })
        .eq('id', editingToken.id);

      if (error) {
        toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'تم', description: 'تم تحديث التوكن بنجاح' });
      }
    } else {
      const { error } = await supabase.from('tokens').insert({
        token: tokenForm.token,
        balance: tokenForm.balance
      });

      if (error) {
        toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'تم', description: 'تم إضافة التوكن بنجاح' });
      }
    }

    setShowTokenModal(false);
    fetchData();
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

  // Order handlers
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

  const getProductStock = (productId: string) => {
    return stockItems.filter(item => item.product_id === productId && !item.is_sold);
  };

  const getOptionStock = (optionId: string) => {
    return stockItems.filter(item => item.option_id === optionId && !item.is_sold);
  };

  // Stock modal handlers
  const openStockModal = (productId: string, optionId?: string) => {
    setCurrentStockProductId(productId);
    setCurrentStockOptionId(optionId || null);
    setNewStockItems('');
    setShowStockModal(true);
  };

  const handleAddStock = async () => {
    if (!currentStockProductId || !newStockItems.trim()) {
      toast({ title: 'خطأ', description: 'يرجى إدخال عناصر المخزون', variant: 'destructive' });
      return;
    }

    const items = newStockItems.split('\n').filter(item => item.trim());
    if (items.length === 0) {
      toast({ title: 'خطأ', description: 'يرجى إدخال عناصر المخزون', variant: 'destructive' });
      return;
    }

    const stockToInsert = items.map(content => ({
      product_id: currentStockOptionId ? null : currentStockProductId,
      option_id: currentStockOptionId || null,
      content: content.trim(),
      is_sold: false
    }));

    const { error } = await supabase.from('stock_items').insert(stockToInsert);
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: `تم إضافة ${items.length} عنصر للمخزون` });
      setShowStockModal(false);
      setNewStockItems('');
      fetchData();
    }
  };

  const handleDeleteStockItem = async (id: string) => {
    const { error } = await supabase.from('stock_items').delete().eq('id', id);
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: 'تم حذف العنصر' });
      fetchData();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
          <p className="mt-4 text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'orders', label: 'الطلبات', icon: ShoppingBag, count: orders.length },
    { id: 'products', label: 'الأقسام', icon: Package, count: products.length },
    { id: 'tokens', label: 'التوكنات', icon: Key, count: tokens.length },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Settings className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold">لوحة التحكم</h1>
                <p className="text-xs text-muted-foreground">إدارة المنتجات والطلبات</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'products' | 'tokens' | 'orders')}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                    : 'bg-card hover:bg-muted border border-border'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-primary-foreground/20' : 'bg-muted'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="text-center py-16 bg-card rounded-xl border border-border">
                <ShoppingBag className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">لا توجد طلبات حالياً</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {orders.map((order) => (
                  <OrderCard 
                    key={order.id} 
                    order={order} 
                    onUpdateStatus={handleUpdateOrderStatus}
                    onDelete={handleDeleteOrder}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => openProductModal()}
                className="btn-primary flex items-center gap-2 px-5 py-3"
              >
                <Plus className="w-5 h-5" />
                <span>إضافة قسم</span>
              </button>
            </div>

            {products.length === 0 ? (
              <div className="text-center py-16 bg-card rounded-xl border border-border">
                <Package className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">لا توجد أقسام حالياً</p>
                <button
                  onClick={() => openProductModal()}
                  className="btn-primary px-5 py-2"
                >
                  إضافة قسم جديد
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    options={getProductOptions(product.id)}
                    stockCount={getProductStock(product.id).length}
                    isExpanded={expandedProduct === product.id}
                    onToggleExpand={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}
                    onEdit={() => openProductModal(product)}
                    onDelete={() => handleDeleteProduct(product.id)}
                    onAddOption={() => openOptionModal(product.id)}
                    onEditOption={(option) => openOptionModal(product.id, option)}
                    onDeleteOption={handleDeleteOption}
                    onManageStock={() => openStockModal(product.id)}
                    onManageOptionStock={(optionId) => openStockModal(product.id, optionId)}
                    getOptionStockCount={(optionId) => getOptionStock(optionId).length}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tokens Tab */}
        {activeTab === 'tokens' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => openTokenModal()}
                className="btn-primary flex items-center gap-2 px-5 py-3"
              >
                <Plus className="w-5 h-5" />
                <span>إضافة توكن</span>
              </button>
            </div>

            {tokens.length === 0 ? (
              <div className="text-center py-16 bg-card rounded-xl border border-border">
                <Key className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">لا توجد توكنات حالياً</p>
                <button
                  onClick={() => openTokenModal()}
                  className="btn-primary px-5 py-2"
                >
                  إضافة توكن جديد
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                {tokens.map((token) => (
                  <div key={token.id} className="bg-card rounded-xl border border-border p-4 flex items-center justify-between gap-4 hover:shadow-md transition-shadow">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono font-bold text-lg truncate">{token.token}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        الرصيد: <span className="text-primary font-semibold">${token.balance}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => openTokenModal(token)} className="p-2 hover:bg-muted rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteToken(token.id)} className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-card rounded-2xl w-full max-w-2xl shadow-2xl my-8">
            {/* Header */}
            <div className="p-6 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                {editingProduct ? 'تعديل القسم' : 'إضافة قسم جديد'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">القسم يحتوي على المنتجات المتشابهة (مثل: حسابات جيميل)</p>
            </div>
            
            <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto">
              {/* Section 1: Basic Info */}
              <div className="bg-muted/20 rounded-xl p-4 border border-border">
                <h3 className="text-sm font-bold text-primary mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">1</span>
                  معلومات القسم الأساسية
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">اسم القسم *</label>
                    <input
                      type="text"
                      placeholder="مثال: حسابات جيميل، حسابات نتفليكس..."
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      className="input-field w-full"
                    />
                  </div>
                </div>
              </div>


              {/* Section 3: Products/Options */}
              {!editingProduct && (
                <div className="bg-primary/5 rounded-xl p-4 border border-primary/20">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">2</span>
                      المنتجات (الخيارات المتاحة)
                    </h3>
                    <button
                      type="button"
                      onClick={addNewProductOption}
                      className="bg-primary text-primary-foreground text-sm px-3 py-1.5 rounded-lg flex items-center gap-1 font-medium hover:bg-primary/90 transition-colors"
                    >
                      <Plus className="w-4 h-4" /> إضافة منتج
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    مثال: لو القسم "حسابات جيميل" → المنتجات تكون: "شهر واحد"، "شهرين"، "3 شهور"
                  </p>
                  
                  {newProductOptions.length === 0 ? (
                    <div className="text-center py-8 bg-background/50 rounded-lg border-2 border-dashed border-border">
                      <LayoutGrid className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">لا توجد منتجات</p>
                      <p className="text-xs text-muted-foreground mt-1">اضغط على "إضافة منتج" لإضافة خيارات للقسم</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {newProductOptions.map((opt, index) => (
                        <div key={index} className="bg-background rounded-lg p-4 border border-border shadow-sm">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-bold text-foreground flex items-center gap-2">
                              <span className="w-5 h-5 rounded bg-primary/10 text-primary flex items-center justify-center text-xs">{index + 1}</span>
                              المنتج #{index + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeNewProductOption(index)}
                              className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          
                          {/* Row 1: Name, Duration, Price */}
                          <div className="grid grid-cols-3 gap-3 mb-3">
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">اسم المنتج *</label>
                              <input
                                type="text"
                                placeholder="مثال: نتفليكس برايم"
                                value={opt.name}
                                onChange={(e) => updateNewProductOption(index, 'name', e.target.value)}
                                className="input-field text-sm w-full"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">مدة الاشتراك</label>
                              <input
                                type="text"
                                placeholder="مثال: شهر واحد"
                                value={opt.duration}
                                onChange={(e) => updateNewProductOption(index, 'duration', e.target.value)}
                                className="input-field text-sm w-full"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">السعر ($) *</label>
                              <input
                                type="number"
                                placeholder="0"
                                value={opt.price || ''}
                                onChange={(e) => updateNewProductOption(index, 'price', parseFloat(e.target.value) || 0)}
                                className="input-field text-sm w-full"
                              />
                            </div>
                          </div>

                          {/* Row 2: Delivery Type */}
                          <div className="mb-3">
                            <label className="text-xs text-muted-foreground mb-2 block">نوع التسليم</label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => updateNewProductOption(index, 'delivery_type', 'manual')}
                                className={`flex-1 py-2.5 px-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                  opt.delivery_type === 'manual' 
                                    ? 'bg-warning/10 border-warning text-warning' 
                                    : 'border-border hover:bg-muted'
                                }`}
                              >
                                <Clock className="w-4 h-4" />
                                يدوي (خدمات)
                              </button>
                              <button
                                type="button"
                                onClick={() => updateNewProductOption(index, 'delivery_type', 'auto')}
                                className={`flex-1 py-2.5 px-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                  opt.delivery_type === 'auto' 
                                    ? 'bg-success/10 border-success text-success' 
                                    : 'border-border hover:bg-muted'
                                }`}
                              >
                                <Zap className="w-4 h-4" />
                                تلقائي (اكونتات)
                              </button>
                            </div>
                          </div>

                          {/* Manual: Show input type required from customer */}
                          {opt.delivery_type === 'manual' && (
                            <div className="grid grid-cols-2 gap-3 mb-3 p-3 bg-warning/5 rounded-lg border border-warning/20">
                              <div>
                                <label className="text-xs text-muted-foreground mb-1 block">البيانات المطلوبة من العميل</label>
                                <select
                                  value={opt.input_type}
                                  onChange={(e) => updateNewProductOption(index, 'input_type', e.target.value)}
                                  className="input-field text-sm w-full"
                                >
                                  <option value="email_password">إيميل وباسورد</option>
                                  <option value="link">رابط فقط</option>
                                  <option value="text">نص</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground mb-1 block">الوقت المتوقع للتنفيذ</label>
                                <input
                                  type="text"
                                  placeholder="مثال: 24 ساعة"
                                  value={opt.estimated_time}
                                  onChange={(e) => updateNewProductOption(index, 'estimated_time', e.target.value)}
                                  className="input-field text-sm w-full"
                                />
                              </div>
                            </div>
                          )}

                          {/* Auto: Show stock content input */}
                          {opt.delivery_type === 'auto' && (
                            <div className="p-3 bg-success/5 rounded-lg border border-success/20 mb-3">
                              <label className="text-xs text-muted-foreground mb-1 block">
                                الداتا للعميل (كل سطر = منتج واحد)
                              </label>
                              <textarea
                                placeholder="مثال:&#10;email1@gmail.com:password123&#10;email2@gmail.com:password456"
                                value={opt.stock_content}
                                onChange={(e) => updateNewProductOption(index, 'stock_content', e.target.value)}
                                className="input-field text-sm w-full h-24 resize-none font-mono"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                المخزون الحالي: {opt.stock_content.split('\n').filter(line => line.trim()).length} منتج
                              </p>
                            </div>
                          )}

                          {/* Description */}
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">وصف (اختياري)</label>
                            <input
                              type="text"
                              placeholder="وصف مختصر للمنتج..."
                              value={opt.description}
                              onChange={(e) => updateNewProductOption(index, 'description', e.target.value)}
                              className="input-field w-full text-sm"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
            
            {/* Footer */}
            <div className="p-6 border-t border-border bg-muted/20 flex gap-3">
              <button onClick={handleSaveProduct} className="btn-primary flex-1 py-3 flex items-center justify-center gap-2 text-base">
                <Save className="w-5 h-5" />
                {editingProduct ? 'حفظ التغييرات' : 'إنشاء القسم'}
              </button>
              <button onClick={() => setShowProductModal(false)} className="px-8 py-3 border border-border rounded-lg hover:bg-muted transition-colors font-medium">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Option Modal */}
      {showOptionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-bold">{editingOption ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h2>
            </div>
            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              {/* Row 1: Name, Duration, Price */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">اسم المنتج *</label>
                  <input
                    type="text"
                    placeholder="مثال: نتفليكس برايم"
                    value={optionForm.name}
                    onChange={(e) => setOptionForm({ ...optionForm, name: e.target.value })}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">مدة الاشتراك</label>
                  <input
                    type="text"
                    placeholder="مثال: شهر واحد"
                    value={optionForm.duration}
                    onChange={(e) => setOptionForm({ ...optionForm, duration: e.target.value })}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">السعر ($) *</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={optionForm.price}
                    onChange={(e) => setOptionForm({ ...optionForm, price: parseFloat(e.target.value) || 0 })}
                    className="input-field w-full"
                  />
                </div>
              </div>

              {/* Delivery Type */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">نوع التسليم</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOptionForm({ ...optionForm, delivery_type: 'manual' })}
                    className={`flex-1 py-2.5 px-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      optionForm.delivery_type === 'manual' 
                        ? 'bg-warning/10 border-warning text-warning' 
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    يدوي (خدمات)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOptionForm({ ...optionForm, delivery_type: 'auto' })}
                    className={`flex-1 py-2.5 px-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      optionForm.delivery_type === 'auto' 
                        ? 'bg-success/10 border-success text-success' 
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                    تلقائي (اكونتات)
                  </button>
                </div>
              </div>

              {/* Manual: Show input type required from customer */}
              {optionForm.delivery_type === 'manual' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-warning/5 rounded-lg border border-warning/20">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">البيانات المطلوبة من العميل</label>
                    <select
                      value={optionForm.type}
                      onChange={(e) => setOptionForm({ ...optionForm, type: e.target.value })}
                      className="input-field w-full"
                    >
                      <option value="email_password">إيميل وباسورد</option>
                      <option value="link">رابط فقط</option>
                      <option value="text">نص</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">الوقت المتوقع للتنفيذ</label>
                    <input
                      type="text"
                      placeholder="مثال: 24 ساعة"
                      value={optionForm.estimated_time}
                      onChange={(e) => setOptionForm({ ...optionForm, estimated_time: e.target.value })}
                      className="input-field w-full"
                    />
                  </div>
                </div>
              )}

              {/* Auto: Show stock management */}
              {optionForm.delivery_type === 'auto' && (
                <div className="p-3 bg-success/5 rounded-lg border border-success/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-success font-medium flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        استلام فوري من المخزون
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        المخزون الحالي: {editingOption ? getOptionStock(editingOption.id).length : 0} عنصر
                      </p>
                    </div>
                    {editingOption && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowOptionModal(false);
                          openStockModal(currentProductId!, editingOption.id);
                        }}
                        className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
                      >
                        <Database className="w-4 h-4" />
                        إدارة المخزون
                      </button>
                    )}
                  </div>
                  {!editingOption && (
                    <p className="text-xs text-muted-foreground">
                      يمكنك إضافة المخزون بعد حفظ المنتج من خلال زر "إدارة المخزون"
                    </p>
                  )}
                </div>
              )}

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">الوصف (اختياري)</label>
                <input
                  type="text"
                  placeholder="وصف مختصر للمنتج..."
                  value={optionForm.description}
                  onChange={(e) => setOptionForm({ ...optionForm, description: e.target.value })}
                  className="input-field w-full"
                />
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3">
              <button onClick={handleSaveOption} className="btn-primary flex-1 py-3 flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />
                {editingOption ? 'حفظ التغييرات' : 'إضافة المنتج'}
              </button>
              <button onClick={() => setShowOptionModal(false)} className="px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Token Modal */}
      {showTokenModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-bold">{editingToken ? 'تعديل التوكن' : 'إضافة توكن جديد'}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">التوكن *</label>
                <input
                  type="text"
                  placeholder="أدخل التوكن..."
                  value={tokenForm.token}
                  onChange={(e) => setTokenForm({ ...tokenForm, token: e.target.value })}
                  className="input-field w-full font-mono"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">الرصيد ($)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={tokenForm.balance}
                  onChange={(e) => setTokenForm({ ...tokenForm, balance: parseFloat(e.target.value) || 0 })}
                  className="input-field w-full"
                />
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3">
              <button onClick={handleSaveToken} className="btn-primary flex-1 py-3 flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />
                {editingToken ? 'حفظ التغييرات' : 'إضافة التوكن'}
              </button>
              <button onClick={() => setShowTokenModal(false)} className="px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Management Modal */}
      {showStockModal && (currentStockProductId || currentStockOptionId) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-card rounded-2xl w-full max-w-lg shadow-2xl my-8">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Database className="w-5 h-5 text-success" />
                إدارة المخزون {currentStockOptionId ? '(للمنتج)' : '(للقسم)'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                المتوفر حالياً: {currentStockOptionId ? getOptionStock(currentStockOptionId).length : getProductStock(currentStockProductId!).length} عنصر
              </p>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Add new items */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  إضافة عناصر جديدة (كل سطر = عنصر واحد)
                </label>
                <textarea
                  placeholder="أدخل كل حساب أو كود في سطر منفصل..."
                  value={newStockItems}
                  onChange={(e) => setNewStockItems(e.target.value)}
                  className="input-field w-full h-32 font-mono text-sm"
                />
                {newStockItems.trim() && (
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-success flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {newStockItems.split('\n').filter(item => item.trim()).length} عنصر جديد
                    </p>
                    <button
                      onClick={handleAddStock}
                      className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      إضافة للمخزون
                    </button>
                  </div>
                )}
              </div>

              {/* Current stock items */}
              <div className="border-t border-border pt-4">
                <label className="text-sm font-medium text-muted-foreground mb-3 block">
                  العناصر المتوفرة ({currentStockOptionId ? getOptionStock(currentStockOptionId).length : getProductStock(currentStockProductId!).length})
                </label>
                {(currentStockOptionId ? getOptionStock(currentStockOptionId).length : getProductStock(currentStockProductId!).length) === 0 ? (
                  <div className="text-center py-6 text-muted-foreground bg-muted/30 rounded-lg">
                    <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">لا توجد عناصر في المخزون</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {(currentStockOptionId ? getOptionStock(currentStockOptionId) : getProductStock(currentStockProductId!)).map((item) => (
                      <div key={item.id} className="bg-muted/30 p-2 rounded-lg flex items-center justify-between gap-2">
                        <code className="text-xs font-mono truncate flex-1">{item.content}</code>
                        <button
                          onClick={() => handleDeleteStockItem(item.id)}
                          className="p-1 text-destructive hover:bg-destructive/10 rounded"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-border">
              <button
                onClick={() => {
                  setShowStockModal(false);
                  setCurrentStockOptionId(null);
                }}
                className="w-full py-3 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
