import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingCart, Search, CheckCircle, AlertCircle, Loader2, Clock, XCircle, CheckCircle2, Copy } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

interface Order {
  id: string;
  product_id: string | null;
  option_id: string | null;
  amount: number;
  status: string;
  created_at: string;
  response_message: string | null;
}

const Index = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedOptionId, setSelectedOptionId] = useState('');
  const [token, setToken] = useState('');
  const [verificationLink, setVerificationLink] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [textInput, setTextInput] = useState('');
  const [step, setStep] = useState<'initial' | 'details' | 'waiting' | 'result'>('initial');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const [showBalance, setShowBalance] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [tokenData, setTokenData] = useState<{ id: string; balance: number } | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<string>('pending');
  const [responseMessage, setResponseMessage] = useState<string | null>(null);
  const [tokenOrders, setTokenOrders] = useState<Order[]>([]);
  const [optionStockCounts, setOptionStockCounts] = useState<Record<string, number>>({});
  const { toast } = useToast();

  const product = products.find(p => p.id === selectedProductId);
  const options = productOptions.filter(o => o.product_id === selectedProductId);
  const selectedOption = productOptions.find(o => o.id === selectedOptionId);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data: productsData } = await supabase.from('products').select('*').order('name');
    const { data: optionsData } = await supabase.from('product_options').select('*');
    
    // Fetch stock counts for auto-delivery options
    const { data: stockData } = await supabase
      .from('stock_items')
      .select('option_id')
      .eq('is_sold', false);
    
    // Count stock per option
    const counts: Record<string, number> = {};
    stockData?.forEach(item => {
      if (item.option_id) {
        counts[item.option_id] = (counts[item.option_id] || 0) + 1;
      }
    });
    
    setProducts(productsData || []);
    setProductOptions(optionsData || []);
    setOptionStockCounts(counts);
  };

  const verifyToken = async (tokenValue: string) => {
    const { data } = await supabase
      .from('tokens')
      .select('id, balance')
      .eq('token', tokenValue)
      .maybeSingle();

    return data;
  };

  const handleBuySubmit = async () => {
    if (!token.trim() || !product || !selectedOption) return;

    setIsLoading(true);
    const data = await verifyToken(token);
    setIsLoading(false);

    if (!data) {
      toast({
        title: 'خطأ',
        description: 'التوكن غير صالح',
        variant: 'destructive',
      });
      return;
    }

    setTokenData(data);
    setTokenBalance(Number(data.balance));
    setStep('details');
  };

  const handleOrderSubmit = async () => {
    if (!selectedOption || !tokenData || !product) return;

    if (selectedOption.type === 'link' && !verificationLink.trim()) return;
    if (selectedOption.type === 'email_password' && (!email.trim() || !password.trim())) return;
    if (selectedOption.type === 'text' && !textInput.trim()) return;

    if (tokenBalance === null || tokenBalance < Number(selectedOption.price)) {
      setResult('error');
      setStep('result');
      return;
    }

    setIsLoading(true);

    // Check if this is an auto-delivery product (type === 'none')
    const isAutoDelivery = selectedOption.type === 'none' || !selectedOption.type;

    // For auto-delivery, first check if stock is available
    if (isAutoDelivery) {
      const { data: stockItem, error: stockError } = await supabase
        .from('stock_items')
        .select('id, content')
        .eq('option_id', selectedOption.id)
        .eq('is_sold', false)
        .limit(1)
        .maybeSingle();

      if (stockError || !stockItem) {
        toast({
          title: 'خطأ',
          description: 'المنتج غير متوفر حالياً',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Create order with completed status for auto-delivery
      const { data: orderData, error: orderError } = await supabase.from('orders').insert({
        token_id: tokenData.id,
        product_id: product.id,
        option_id: selectedOption.id,
        amount: selectedOption.price,
        status: 'completed',
        response_message: stockItem.content
      }).select('id').single();

      if (orderError || !orderData) {
        toast({
          title: 'خطأ',
          description: 'فشل في إرسال الطلب',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Mark stock item as sold
      await supabase
        .from('stock_items')
        .update({ 
          is_sold: true, 
          sold_at: new Date().toISOString(),
          sold_to_order_id: orderData.id 
        })
        .eq('id', stockItem.id);

      // Deduct balance
      const newBalance = tokenBalance - Number(selectedOption.price);
      await supabase
        .from('tokens')
        .update({ balance: newBalance })
        .eq('id', tokenData.id);

      setTokenBalance(newBalance);
      setResponseMessage(stockItem.content);
      setResult('success');
      setIsLoading(false);
      setStep('result');
      return;
    }

    // For manual delivery products
    const { data: orderData, error: orderError } = await supabase.from('orders').insert({
      token_id: tokenData.id,
      product_id: product.id,
      option_id: selectedOption.id,
      email: selectedOption.type === 'email_password' ? email : null,
      password: selectedOption.type === 'email_password' ? password : null,
      verification_link: selectedOption.type === 'link' ? verificationLink : (selectedOption.type === 'text' ? textInput : null),
      amount: selectedOption.price,
      status: 'pending'
    }).select('id').single();

    if (orderError || !orderData) {
      toast({
        title: 'خطأ',
        description: 'فشل في إرسال الطلب',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    // Deduct balance
    const newBalance = tokenBalance - Number(selectedOption.price);
    await supabase
      .from('tokens')
      .update({ balance: newBalance })
      .eq('id', tokenData.id);

    setTokenBalance(newBalance);
    setCurrentOrderId(orderData.id);
    setOrderStatus('pending');
    setResponseMessage(null);
    setIsLoading(false);
    setStep('waiting');
  };

  const handleReset = () => {
    setToken('');
    setVerificationLink('');
    setEmail('');
    setPassword('');
    setTextInput('');
    setSelectedProductId('');
    setSelectedOptionId('');
    setStep('initial');
    setResult(null);
    setTokenData(null);
    setTokenBalance(null);
    setCurrentOrderId(null);
    setOrderStatus('pending');
    setResponseMessage(null);
  };

  // Subscribe to order updates in real-time
  useEffect(() => {
    if (!currentOrderId || step !== 'waiting') return;

    const channel = supabase
      .channel(`order-${currentOrderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${currentOrderId}`
        },
        async (payload) => {
          const updatedOrder = payload.new as { status: string; response_message: string | null; amount: number };
          setOrderStatus(updatedOrder.status);
          setResponseMessage(updatedOrder.response_message);
          
          // Only show result for completed or rejected status
          if (updatedOrder.status === 'completed' || updatedOrder.status === 'rejected') {
            // Refund the amount if rejected
            if (updatedOrder.status === 'rejected' && tokenData) {
              const refundAmount = Number(updatedOrder.amount);
              const newBalance = (tokenBalance || 0) + refundAmount;
              
              await supabase
                .from('tokens')
                .update({ balance: newBalance })
                .eq('id', tokenData.id);
              
              setTokenBalance(newBalance);
            }
            
            setResult(updatedOrder.status === 'completed' ? 'success' : 'error');
            setStep('result');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrderId, step]);

  const handleProductChange = (value: string) => {
    setSelectedProductId(value);
    setSelectedOptionId('');
  };

  const handleShowBalance = async () => {
    if (!token.trim()) return;

    setIsLoading(true);
    const data = await verifyToken(token);

    if (data) {
      setTokenData(data);
      setTokenBalance(Number(data.balance));
      setShowBalance(true);
      
      // Fetch orders for this token
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('token_id', data.id)
        .order('created_at', { ascending: false });
      
      setTokenOrders(ordersData || []);
    } else {
      toast({
        title: 'خطأ',
        description: 'التوكن غير صالح',
        variant: 'destructive',
      });
      setShowBalance(false);
      setTokenOrders([]);
    }
    setIsLoading(false);
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return { label: 'مكتمل', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' };
      case 'rejected':
        return { label: 'مرفوض', icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' };
      case 'in_progress':
        return { label: 'قيد التنفيذ', icon: Loader2, color: 'text-blue-600', bg: 'bg-blue-100' };
      default:
        return { label: 'قيد الانتظار', icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' };
    }
  };

  const getProductName = (productId: string | null, optionId: string | null) => {
    if (!productId && !optionId) return 'غير معروف';
    const product = products.find(p => p.id === productId);
    const option = productOptions.find(o => o.id === optionId);
    if (product && option) {
      return `${product.name} - ${option.name}`;
    }
    return product?.name || option?.name || 'غير معروف';
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6">
        {/* Main Content - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Buy Here Card */}
          <div className="card-simple p-6">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-primary">اشتري من هنا</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            اختر المنتج، ادخل التوكن
          </p>

          {step === 'initial' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">اختر المنتج</label>
                <Select value={selectedProductId} onValueChange={handleProductChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="اختر منتج..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} {p.duration && `- ${p.duration}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {product && options.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">اختر نوع الخدمة</label>
                  <Select value={selectedOptionId} onValueChange={setSelectedOptionId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="اختر نوع الخدمة..." />
                    </SelectTrigger>
                    <SelectContent>
                    {options.map((opt) => {
                        const stockCount = optionStockCounts[opt.id] || 0;
                        const isAutoDelivery = opt.type === 'none' || !opt.type;
                        return (
                          <SelectItem key={opt.id} value={opt.id} disabled={isAutoDelivery && stockCount === 0}>
                            {opt.name}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>

                  {selectedOption && (
                    <div className="mt-2 p-2 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        {selectedOption.description}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-primary">
                            السعر: ${selectedOption.price}
                          </span>
                          {selectedOption.duration && (
                            <span className="text-xs bg-muted-foreground/10 text-muted-foreground px-2 py-0.5 rounded-full">
                              {selectedOption.duration}
                            </span>
                          )}
                        </div>
                        {(selectedOption.type === 'none' || !selectedOption.type) && (
                          <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full">
                            متوفر: {optionStockCounts[selectedOption.id] || 0}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">التوكن</label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="input-field w-full"
                  placeholder="ادخل التوكن الخاص بك"
                />
              </div>

              <button
                onClick={handleBuySubmit}
                disabled={!token.trim() || !selectedProductId || !selectedOptionId || isLoading}
                className="btn-primary w-full py-3 disabled:opacity-50"
              >
                {isLoading ? 'جاري التحقق...' : 'متابعة'}
              </button>

              {/* Balance Check Section */}
              <div className="border-t border-border pt-4 mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">أو تحقق من رصيدك</span>
                </div>
                <button
                  onClick={handleShowBalance}
                  disabled={!token.trim() || isLoading}
                  className="w-full py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'جاري التحقق...' : 'عرض الرصيد'}
                </button>

                {showBalance && tokenBalance !== null && (
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 mt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">الرصيد الحالي:</span>
                      <span className="text-lg font-bold text-primary">${tokenBalance}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'details' && product && selectedOption && tokenBalance !== null && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">رصيد التوكن:</span>
                  <span className="font-bold text-primary">${tokenBalance}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm text-muted-foreground">سعر الخدمة:</span>
                  <span className="font-bold">${selectedOption.price}</span>
                </div>
                <div className="border-t border-border mt-2 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">المتبقي بعد الخصم:</span>
                    <span className={`font-bold ${tokenBalance >= Number(selectedOption.price) ? 'text-green-600' : 'text-red-600'}`}>
                      ${tokenBalance - Number(selectedOption.price)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Show message for instant delivery (no data required) */}
              {(selectedOption.type === 'none' || !selectedOption.type) && (
                <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-center">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-green-800">استلام فوري</p>
                  <p className="text-xs text-green-600 mt-1">سيتم إرسال المنتج فوراً بعد تأكيد الطلب</p>
                </div>
              )}

              {selectedOption.type === 'link' && (
                <div>
                  <label className="block text-sm font-medium mb-2">الرابط</label>
                  <input
                    type="text"
                    value={verificationLink}
                    onChange={(e) => setVerificationLink(e.target.value)}
                    className="input-field w-full"
                    placeholder="ادخل الرابط"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    الوقت المتوقع: {selectedOption.estimated_time}
                  </p>
                </div>
              )}

              {selectedOption.type === 'email_password' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">الإيميل</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-field w-full"
                      placeholder="ادخل إيميل الحساب"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">الباسورد</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-field w-full"
                      placeholder="ادخل باسورد الحساب"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    الوقت المتوقع: {selectedOption.estimated_time}
                  </p>
                </div>
              )}

              {selectedOption.type === 'text' && (
                <div>
                  <label className="block text-sm font-medium mb-2">النص المطلوب</label>
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    className="input-field w-full h-24"
                    placeholder="ادخل النص المطلوب"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    الوقت المتوقع: {selectedOption.estimated_time}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('initial')}
                  className="flex-1 py-3 border border-border rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                >
                  رجوع
                </button>
                <button
                  onClick={handleOrderSubmit}
                  disabled={
                    isLoading ||
                    tokenBalance < Number(selectedOption.price) ||
                    (selectedOption.type === 'link' && !verificationLink.trim()) ||
                    (selectedOption.type === 'email_password' && (!email.trim() || !password.trim())) ||
                    (selectedOption.type === 'text' && !textInput.trim())
                  }
                  className="btn-primary flex-1 py-3 disabled:opacity-50"
                >
                  {isLoading ? 'جاري المعالجة...' : 'إرسال الطلب'}
                </button>
              </div>
            </div>
          )}

          {step === 'waiting' && (
            <div className="space-y-4 text-center py-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <h3 className="text-lg font-bold">
                {orderStatus === 'in_progress' ? 'تم استلام طلبك وقيد التنفيذ' : 'جاري معالجة طلبك...'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {orderStatus === 'in_progress' 
                  ? 'يرجى الانتظار، جاري العمل على طلبك'
                  : `يرجى الانتظار، سيتم تفعيل الخدمة خلال ${selectedOption?.estimated_time}`
                }
              </p>
              {responseMessage && (
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-sm text-blue-800">{responseMessage}</p>
                </div>
              )}
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-sm">الرصيد المتبقي: <span className="font-bold">${tokenBalance}</span></p>
              </div>
            </div>
          )}

          {step === 'result' && (
            <div className="space-y-4 text-center py-4">
              {result === 'success' ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-bold text-green-600">تم تفعيل الخدمة بنجاح!</h3>
                  {responseMessage && (
                    <div className="text-right">
                      <div className="flex items-center justify-between mb-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(responseMessage);
                            toast({ title: 'تم النسخ', description: 'تم نسخ المحتوى بنجاح' });
                          }}
                          className="p-2 hover:bg-muted rounded-lg transition-colors"
                          title="نسخ"
                        >
                          <Copy className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <span className="text-sm font-medium text-primary">محتوى الطلب</span>
                      </div>
                      <div className="p-4 rounded-lg bg-card border border-border max-h-48 overflow-y-auto">
                        <pre className="text-sm text-foreground whitespace-pre-wrap text-right font-mono leading-relaxed">
                          {responseMessage}
                        </pre>
                      </div>
                    </div>
                  )}
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-sm">الرصيد المتبقي: <span className="font-bold">${tokenBalance}</span></p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <h3 className="text-lg font-bold text-red-600">
                    {orderStatus === 'rejected' ? 'تم رفض الطلب' : 'فشل في إتمام الطلب'}
                  </h3>
                  {responseMessage && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                      <p className="text-sm text-red-800">{responseMessage}</p>
                    </div>
                  )}
                </>
              )}
              <button
                onClick={handleReset}
                className="btn-primary w-full py-3 mt-4"
              >
                طلب جديد
              </button>
            </div>
          )}
        </div>

          {/* Info Card */}
          <div className="card-simple p-6">
            <div className="flex items-center gap-2 mb-2">
              <Search className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold text-primary">معلومات الرصيد</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              البحث عن التفعيل - سجل المعاملات - الرصيد
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">التوكن</label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => { setToken(e.target.value); setShowBalance(false); }}
                  className="input-field w-full"
                  placeholder="ادخل التوكن الخاص بك"
                />
              </div>

              <button
                onClick={handleShowBalance}
                disabled={!token.trim() || isLoading}
                className="btn-primary w-full py-3 disabled:opacity-50"
              >
                {isLoading ? 'جاري التحقق...' : 'عرض السجل والرصيد'}
              </button>

              {showBalance && tokenBalance !== null && (
                <div className="space-y-4">
                  {/* Balance Display */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">الرصيد الحالي:</span>
                      <span className="text-2xl font-bold text-primary">${tokenBalance}</span>
                    </div>
                  </div>

                  {/* Orders History */}
                  <div className="border-t border-border pt-4">
                    <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4" />
                      سجل الطلبات ({tokenOrders.length})
                    </h3>
                    
                    {tokenOrders.length === 0 ? (
                      <div className="text-center py-6 bg-muted/30 rounded-lg">
                        <ShoppingCart className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">لا توجد طلبات سابقة</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {tokenOrders.map((order) => {
                          const statusInfo = getStatusInfo(order.status);
                          const StatusIcon = statusInfo.icon;
                          return (
                            <div key={order.id} className="bg-muted/30 rounded-lg p-3 border border-border">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">
                                    {getProductName(order.product_id, order.option_id)}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {new Date(order.created_at).toLocaleDateString('ar-EG')} - {new Date(order.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                                <div className="text-left">
                                  <span className="font-bold text-primary text-sm">${order.amount}</span>
                                  <div className={`flex items-center gap-1 mt-1 ${statusInfo.color}`}>
                                    <StatusIcon className={`w-3 h-3 ${order.status === 'in_progress' ? 'animate-spin' : ''}`} />
                                    <span className="text-xs font-medium">{statusInfo.label}</span>
                                  </div>
                                </div>
                              </div>
                              {order.response_message && (
                                <p className="text-xs text-muted-foreground mt-2 p-2 bg-background rounded border">
                                  {order.response_message}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
