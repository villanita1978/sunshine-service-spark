import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingBag, Sparkles, Shield, Clock, ArrowLeft } from 'lucide-react';
import type { Product, ProductOption } from '@/types/services';

const Index = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data: productsData } = await supabase.from('products').select('*').order('name');
      const { data: optionsData } = await supabase.from('product_options').select('*');
      setProducts(productsData || []);
      setProductOptions(optionsData || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getProductOptions = (productId: string) => {
    return productOptions.filter(opt => opt.product_id === productId);
  };

  const getLowestPrice = (productId: string) => {
    const options = getProductOptions(productId);
    if (options.length === 0) return null;
    return Math.min(...options.map(opt => opt.price));
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
              <h1 className="text-xl font-bold text-foreground">خدمات فيري</h1>
            </div>
            <Link 
              to="/admin-auth" 
              className="nav-btn bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              لوحة التحكم
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        <div className="container mx-auto px-4 relative">
          <div className="text-center max-w-2xl mx-auto animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              اشتراكاتك المفضلة
              <span className="block text-primary mt-2">بأسعار منافسة</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              احصل على أفضل الاشتراكات الرقمية بأسعار لا تُقاوم مع ضمان وخدمة متميزة
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-full shadow-sm">
                <Shield className="w-4 h-4 text-success" />
                <span className="text-sm text-foreground">ضمان كامل</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-full shadow-sm">
                <Clock className="w-4 h-4 text-info" />
                <span className="text-sm text-foreground">تفعيل فوري</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-full shadow-sm">
                <ShoppingBag className="w-4 h-4 text-warning" />
                <span className="text-sm text-foreground">أسعار مميزة</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <h3 className="text-2xl font-bold text-foreground mb-8">المنتجات المتاحة</h3>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-card rounded-xl p-6 animate-pulse">
                  <div className="h-40 bg-muted rounded-lg mb-4" />
                  <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h4 className="text-xl font-semibold text-foreground mb-2">لا توجد منتجات حالياً</h4>
              <p className="text-muted-foreground">سيتم إضافة المنتجات قريباً</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product, index) => {
                const lowestPrice = getLowestPrice(product.id);
                const options = getProductOptions(product.id);
                
                return (
                  <div 
                    key={product.id} 
                    className="bg-card rounded-xl overflow-hidden shadow-sm card-hover animate-fade-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {product.image ? (
                      <div className="h-40 overflow-hidden">
                        <img 
                          src={product.image} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-40 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <Sparkles className="w-12 h-12 text-primary/50" />
                      </div>
                    )}
                    <div className="p-6">
                      <h4 className="text-lg font-bold text-foreground mb-2">{product.name}</h4>
                      {product.description && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {product.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <div>
                          {lowestPrice !== null && (
                            <span className="text-lg font-bold text-primary">
                              يبدأ من {lowestPrice} ر.س
                            </span>
                          )}
                          {options.length > 0 && (
                            <span className="text-xs text-muted-foreground block">
                              {options.length} خيار متاح
                            </span>
                          )}
                        </div>
                        <Link
                          to={`/buy?product=${product.id}`}
                          className="btn-primary px-4 py-2 flex items-center gap-2"
                        >
                          <span>شراء</span>
                          <ArrowLeft className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground text-sm">
            © 2024 خدمات فيري - جميع الحقوق محفوظة
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
