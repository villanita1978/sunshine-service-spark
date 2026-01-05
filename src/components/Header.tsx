import { Newspaper, HelpCircle, Users, Coins, Settings } from 'lucide-react';

const Header = () => {
  return (
    <header className="bg-card border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              <span className="text-primary">API</span>{' '}
              <span className="text-foreground">Hub Dashboard</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              إدارة طلبات API وعرض سجل المعاملات
            </p>
          </div>

          {/* Navigation Buttons */}
          <div className="hidden md:flex items-center gap-2 flex-wrap justify-end">
            <button className="nav-btn bg-secondary text-secondary-foreground hover:bg-muted flex items-center gap-2">
              <Newspaper className="w-4 h-4" />
              الأخبار
            </button>
            <button className="nav-btn bg-secondary text-secondary-foreground hover:bg-muted flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              الأسئلة
            </button>
            <button className="nav-btn bg-accent text-accent-foreground hover:opacity-90 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Reseller HUB
            </button>
            <button className="nav-btn bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-2">
              <Coins className="w-4 h-4" />
              شراء رصيد
            </button>
            <button className="nav-btn bg-success text-success-foreground hover:opacity-90 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              الخدمات
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
