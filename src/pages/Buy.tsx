import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight, Key, Package, CheckCircle, AlertCircle, Loader2, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Product, ProductOption } from '@/types/services';

type Step = 'token' | 'details' | 'confirm' | 'success' | 'error';

const Buy = () => {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const productId = searchParams.get('product');

  const [step, setStep] = useState<Step>('token');
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [tokenId, setTokenId] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const [selectedOption, setSelectedOption] = useState<ProductOption | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>(productId || '');

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (productId) {
      setSelectedProductId(productId);
    }
  }, [productId]);

  useEffect(() => {
    if (selectedProductId) {
      const selected = products.find(p => p.id === selectedProductId);
      setProduct(selected || null);
    }
  }, [selectedProductId, products]);

  useEffect(() => {
    if (selectedOptionId && productOptions.length > 0) {
      const option = productOptions.find(o => o.id === selectedOptionId);
      setSelectedOption(option || null);
    }
  }, [selectedOptionId, productOptions]);

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
    
    try {
      const tokenData = await verifyToken(token.trim());
      
      if (!tokenData) {
        toast({
          title: "خطأ",
          description: "التوكن غير صالح",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      if (tokenData.balance < selectedOption.price) {
        toast({
          title: "رصيد غير كافٍ",
          description: `رصيدك الحالي ${tokenData.balance} ر.س والمطلوب ${selectedOption.price} ر.س`,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      setTokenId(tokenData.id);
      setTokenBalance(tokenData.balance);
      setStep('details');
    } catch (error) {
      console.error('Error verifying token:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء التحقق من التوكن",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmPurchase = async () => {
    if (!tokenId || !product || !selectedOption) return;
    
    setIsLoading(true);
    
    try {
      // Create order
      const { error: orderError } = await supabase.from('orders').insert({
        token_id: tokenId,
        product_id: product.id,
        option_id: selectedOption.id,
        amount: selectedOption.price,
        email: email.trim() || null,
        status: 'pending'
      });

      if (orderError) throw orderError;

      // Deduct balance
      const newBalance = (tokenBalance || 0) - selectedOption.price;
      const { error: updateError } = await supabase
        .from('tokens')
        .update({ balance: newBalance })
        .eq('id', tokenId);

      if (updateError) throw updateError;

      setStep('success');
      toast({
        title: "تم الطلب بنجاح!",
        description: "سيتم معالجة طلبك قريباً",
      });
    } catch (error) {
      console.error('Error creating order:', error);
      setStep('error');
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إنشاء الطلب",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getProductOptions = (pid: string) => {
    return productOptions.filter(opt => opt.product_id === pid);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="glass-effect sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
              <ArrowRight className="w-5 h-5" />
              <span>العودة للرئيسية</span>
            </Link>
            <h1 className="text-xl font-bold text-foreground">إتمام الشراء</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-lg">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {['token', 'details', 'confirm'].map((s, i) => (
            <div 
              key={s}
              className={`flex items-center gap-2 ${
                step === s ? 'text-primary' : 
                ['details', 'confirm', 'success'].indexOf(step) > i ? 'text-success' : 'text-muted-foreground'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step === s ? 'bg-primary text-primary-foreground' :
                ['details', 'confirm', 'success'].indexOf(step) > i ? 'bg-success text-success-foreground' : 'bg-muted'
              }`}>
                {i + 1}
              </div>
              {i < 2 && <div className="w-8 h-0.5 bg-border" />}
            </div>
          ))}
        </div>

        <div className="bg-card rounded-xl p-6 shadow-sm animate-fade-in">
          {step === 'token' && (
            <div className="space-y-6">
              <div className="text-center">
                <Key className="w-12 h-12 text-primary mx-auto mb-4" />
                <h2 className="text-xl font-bold text-foreground mb-2">أدخل التوكن والمنتج</h2>
                <p className="text-muted-foreground text-sm">اختر المنتج وأدخل التوكن للمتابعة</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">المنتج</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => {
                      setSelectedProductId(e.target.value);
                      setSelectedOptionId('');
                    }}
                    className="input-field w-full"
                  >
                    <option value="">اختر المنتج</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {selectedProductId && getProductOptions(selectedProductId).length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">الباقة</label>
                    <select
                      value={selectedOptionId}
                      onChange={(e) => setSelectedOptionId(e.target.value)}
                      className="input-field w-full"
                    >
                      <option value="">اختر الباقة</option>
                      {getProductOptions(selectedProductId).map(opt => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name} - {opt.price} ر.س {opt.duration && `(${opt.duration})`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">التوكن</label>
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="أدخل التوكن الخاص بك"
                    className="input-field w-full"
                    dir="ltr"
                  />
                </div>

                <button
                  onClick={handleBuySubmit}
                  disabled={!token.trim() || !selectedProductId || !selectedOptionId || isLoading}
                  className="btn-primary w-full py-3 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري التحقق...</span>
                    </>
                  ) : (
                    <span>متابعة</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 'details' && product && selectedOption && tokenBalance !== null && (
            <div className="space-y-6">
              <div className="text-center">
                <Package className="w-12 h-12 text-primary mx-auto mb-4" />
                <h2 className="text-xl font-bold text-foreground mb-2">تفاصيل الطلب</h2>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">رصيد التوكن:</span>
                    <span className="font-bold text-foreground">{tokenBalance} ر.س</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">المنتج:</span>
                    <span className="font-medium text-foreground">{product.name}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">الباقة:</span>
                    <span className="font-medium text-foreground">{selectedOption.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">السعر:</span>
                    <span className="font-bold text-primary">{selectedOption.price} ر.س</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    <Mail className="w-4 h-4 inline ml-2" />
                    البريد الإلكتروني (اختياري)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="لإرسال تفاصيل الطلب"
                    className="input-field w-full"
                    dir="ltr"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('token')}
                    className="btn-secondary flex-1 py-3"
                  >
                    رجوع
                  </button>
                  <button
                    onClick={handleConfirmPurchase}
                    disabled={isLoading}
                    className="btn-primary flex-1 py-3 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جاري المعالجة...</span>
                      </>
                    ) : (
                      <span>تأكيد الشراء</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">تم الطلب بنجاح!</h2>
              <p className="text-muted-foreground mb-6">
                سيتم معالجة طلبك وإرسال التفاصيل قريباً
              </p>
              <Link to="/" className="btn-primary px-6 py-3 inline-block">
                العودة للرئيسية
              </Link>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center py-8">
              <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">حدث خطأ!</h2>
              <p className="text-muted-foreground mb-6">
                لم نتمكن من إتمام طلبك، يرجى المحاولة مرة أخرى
              </p>
              <button 
                onClick={() => setStep('token')}
                className="btn-primary px-6 py-3"
              >
                المحاولة مرة أخرى
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Buy;
