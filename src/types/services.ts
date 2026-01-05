export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  duration?: string;
  popular?: boolean;
  image?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductOption {
  id: string;
  product_id: string;
  name: string;
  price: number;
  duration: string | null;
  available: number | null;
  created_at: string;
  updated_at: string;
}

export interface Token {
  id: string;
  token: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  token_id: string | null;
  product_id: string | null;
  option_id: string | null;
  email: string | null;
  amount: number;
  status: string;
  verification_link: string | null;
  created_at: string;
}
