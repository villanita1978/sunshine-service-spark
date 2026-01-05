import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingCart, Search, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
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

const Index = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedOptionId, setSelectedOptionId] = useState('');
  const [token, setToken] = useState('');
  const [verificationLink, setVerificationLink] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'initial' | 'details' | 'waiting' | 'result'>('initial');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const [showBalance, setShowBalance] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [tokenData, setTokenData] = useState<{ id: string; balance: number } | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<string>('pending');
  const [responseMessage, setResponseMessage] = useState<string | null>(null);
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
    setProducts(productsData || []);
    setProductOptions(optionsData || []);
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

    if (selectedOption.type === 'student_verification' && !verificationLink.trim()) return;
    if (selectedOption.type === 'full_activation' && (!email.trim() || !password.trim())) return;

    if (tokenBalance === null || tokenBalance < Number(selectedOption.price)) {
      setResult('error');
      setStep('result');
      return;
    }

    setIsLoading(true);

    // Create order and get the ID
    const { data: orderData, error: orderError } = await supabase.from('orders').insert({
      token_id: tokenData.id,
      product_id: product.id,
      option_id: selectedOption.id,
      email: selectedOption.type === 'full_activation' ? email : null,
      password: selectedOption.type === 'full_activation' ? password : null,
      verification_link: selectedOption.type === 'verification_bypass' ? verificationLink : null,
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
        (payload) => {
          const updatedOrder = payload.new as { status: string; response_message: string | null };
          setOrderStatus(updatedOrder.status);
          setResponseMessage(updatedOrder.response_message);
          
          // Only show result for completed or rejected status
          if (updatedOrder.status === 'completed' || updatedOrder.status === 'rejected') {
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
    setIsLoading(false);

    if (data) {
      setTokenData(data);
      setTokenBalance(Number(data.balance));
      setShowBalance(true);
    } else {
      toast({
        title: 'خطأ',
        description: 'التوكن غير صالح',
        variant: 'destructive',
      });
      setShowBalance(false);
    }
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
                      {options.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>
                          {opt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedOption && (
                    <div className="mt-2 p-2 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        {selectedOption.description}
                      </p>
                      <p className="text-sm font-semibold text-primary mt-1">
                        السعر: ${selectedOption.price}
                      </p>
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

              {selectedOption.type === 'verification_bypass' && (
                <div>
                  <label className="block text-sm font-medium mb-2">رابط التحقق</label>
                  <input
                    type="text"
                    value={verificationLink}
                    onChange={(e) => setVerificationLink(e.target.value)}
                    className="input-field w-full"
                    placeholder="ادخل رابط التحقق الطلابي"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    الوقت المتوقع: {selectedOption.estimated_time}
                  </p>
                </div>
              )}

              {selectedOption.type === 'full_activation' && (
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
                    (selectedOption.type === 'verification_bypass' && !verificationLink.trim()) ||
                    (selectedOption.type === 'full_activation' && (!email.trim() || !password.trim()))
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
                    <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                      <p className="text-sm text-green-800">{responseMessage}</p>
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
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">الرصيد الحالي:</span>
                    <span className="text-2xl font-bold text-primary">${tokenBalance}</span>
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
