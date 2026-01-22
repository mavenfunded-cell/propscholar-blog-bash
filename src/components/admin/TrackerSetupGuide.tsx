import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Code, 
  Copy, 
  Check, 
  FileCode, 
  ShoppingCart, 
  CreditCard, 
  User,
  Eye,
  Trash2,
  CheckCircle2
} from 'lucide-react';

const SUPABASE_URL = 'https://tisijoiblvcrigwhzprn.supabase.co';

const TRACKER_SCRIPT = `<!-- PropScholar Conversion Tracker -->
<script src="${window.location.origin}/ps-track.js" defer></script>`;

const IDENTIFY_USER = `// Call when user logs in or provides email
PSTrack.identify('user@example.com');`;

const PRODUCT_VIEWED = `// Track when user views a product page
PSTrack.productViewed({
  id: 'prod_2k_1step',
  name: '2K One Step Challenge',
  price: 19.99,
  account_size: '2000',
  platform: 'MT5'
});`;

const ADD_TO_CART = `// Track when user adds item to cart
PSTrack.addToCart({
  id: 'prod_2k_1step',
  name: '2K One Step Challenge',
  price: 19.99,
  account_size: '2000',
  platform: 'MT5',
  quantity: 1
});`;

const REMOVE_FROM_CART = `// Track when user removes item from cart
PSTrack.removeFromCart('prod_2k_1step');`;

const CHECKOUT_STARTED = `// Track when user starts checkout
PSTrack.checkoutStarted();`;

const CHECKOUT_ABANDONED = `// Track when user abandons checkout (optional - auto-detected)
PSTrack.checkoutAbandoned('payment_declined');`;

const PURCHASE_COMPLETED = `// Track when purchase is completed
PSTrack.purchaseCompleted({
  order_id: 'order_123456',
  total: 19.99,
  currency: 'USD',
  items: [
    {
      id: 'prod_2k_1step',
      name: '2K One Step Challenge',
      price: 19.99,
      quantity: 1
    }
  ]
});`;

const CUSTOM_EVENT = `// Track any custom event
PSTrack.track('coupon_applied', {
  coupon_code: 'SAVE10',
  discount_percent: 10
});`;

const FULL_INTEGRATION = `<!-- Add to your HTML head -->
<script src="${window.location.origin}/ps-track.js" defer></script>

<script>
// The tracker auto-initializes and tracks page views

// Example: Identify user after login
document.addEventListener('user-logged-in', function(e) {
  PSTrack.identify(e.detail.email);
});

// Example: Track add to cart
document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    PSTrack.addToCart({
      id: this.dataset.productId,
      name: this.dataset.productName,
      price: parseFloat(this.dataset.price),
      account_size: this.dataset.accountSize,
      platform: this.dataset.platform
    });
  });
});

// Example: Track checkout started
document.querySelector('.checkout-btn')?.addEventListener('click', () => {
  PSTrack.checkoutStarted();
});

// Example: Track purchase on success page
if (window.location.pathname.includes('/success')) {
  PSTrack.purchaseCompleted({
    order_id: new URLSearchParams(window.location.search).get('order_id'),
    total: parseFloat(document.querySelector('[data-total]')?.dataset.total || '0'),
    currency: 'USD'
  });
}
</script>`;

const REACT_INTEGRATION = `// hooks/useConversionTracking.ts
import { useEffect } from 'react';

declare global {
  interface Window {
    PSTrack: {
      identify: (email: string) => void;
      productViewed: (product: object) => void;
      addToCart: (product: object) => void;
      removeFromCart: (productId: string) => void;
      checkoutStarted: () => void;
      checkoutAbandoned: (reason?: string) => void;
      purchaseCompleted: (order: object) => void;
      track: (event: string, data?: object) => void;
    };
  }
}

export const useConversionTracking = () => {
  const identify = (email: string) => {
    window.PSTrack?.identify(email);
  };

  const trackProductView = (product: {
    id: string;
    name: string;
    price: number;
    account_size?: string;
    platform?: string;
  }) => {
    window.PSTrack?.productViewed(product);
  };

  const trackAddToCart = (product: {
    id: string;
    name: string;
    price: number;
    quantity?: number;
    account_size?: string;
    platform?: string;
  }) => {
    window.PSTrack?.addToCart(product);
  };

  const trackRemoveFromCart = (productId: string) => {
    window.PSTrack?.removeFromCart(productId);
  };

  const trackCheckoutStarted = () => {
    window.PSTrack?.checkoutStarted();
  };

  const trackPurchase = (order: {
    order_id: string;
    total: number;
    currency?: string;
    items?: object[];
  }) => {
    window.PSTrack?.purchaseCompleted(order);
  };

  const trackEvent = (event: string, data?: object) => {
    window.PSTrack?.track(event, data);
  };

  return {
    identify,
    trackProductView,
    trackAddToCart,
    trackRemoveFromCart,
    trackCheckoutStarted,
    trackPurchase,
    trackEvent,
  };
};

// Usage in component:
// const { trackAddToCart, trackPurchase } = useConversionTracking();
// trackAddToCart({ id: 'prod_1', name: 'Product', price: 99 });`;

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
}

function CodeBlock({ code, language = 'javascript', title }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      {title && (
        <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border/50 rounded-t-lg">
          <span className="text-xs font-medium text-muted-foreground">{title}</span>
        </div>
      )}
      <div className="relative">
        <pre className={`p-4 bg-muted/30 rounded-${title ? 'b-' : ''}lg overflow-x-auto text-sm`}>
          <code className="text-foreground/90 whitespace-pre">{code}</code>
        </pre>
        <Button
          size="sm"
          variant="ghost"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
          onClick={copyToClipboard}
        >
          {copied ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

export function TrackerSetupGuide() {
  return (
    <Card className="border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code className="w-5 h-5 text-cyan-400" />
          Tracker Setup Guide
        </CardTitle>
        <CardDescription>
          Copy-paste these code snippets to integrate conversion tracking on your website
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="quickstart" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="quickstart">Quick Start</TabsTrigger>
            <TabsTrigger value="events">Events API</TabsTrigger>
            <TabsTrigger value="integrations">Full Examples</TabsTrigger>
          </TabsList>

          <TabsContent value="quickstart" className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <FileCode className="w-4 h-4 text-cyan-400" />
                Step 1: Add the Tracker Script
              </h4>
              <p className="text-sm text-muted-foreground">
                Add this script to your website's &lt;head&gt; or before &lt;/body&gt;
              </p>
              <CodeBlock code={TRACKER_SCRIPT} language="html" />
            </div>

            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <User className="w-4 h-4 text-cyan-400" />
                Step 2: Identify Users (Optional)
              </h4>
              <p className="text-sm text-muted-foreground">
                Call this when a user logs in or provides their email
              </p>
              <CodeBlock code={IDENTIFY_USER} />
            </div>

            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <h4 className="font-medium text-emerald-400 flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4" />
                What's Tracked Automatically
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Page views and navigation</li>
                <li>• Scroll depth (25%, 50%, 75%, 100%)</li>
                <li>• Time on page</li>
                <li>• Session duration</li>
                <li>• Checkout abandonment detection</li>
                <li>• Email input detection</li>
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="events" className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-400" />
                  Product Viewed
                </h4>
                <CodeBlock code={PRODUCT_VIEWED} title="When user views a product" />
              </div>

              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-amber-400" />
                  Add to Cart
                </h4>
                <CodeBlock code={ADD_TO_CART} title="When user adds to cart" />
              </div>

              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-red-400" />
                  Remove from Cart
                </h4>
                <CodeBlock code={REMOVE_FROM_CART} title="When user removes from cart" />
              </div>

              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-violet-400" />
                  Checkout Started
                </h4>
                <CodeBlock code={CHECKOUT_STARTED} title="When user starts checkout" />
              </div>

              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Purchase Completed
                </h4>
                <CodeBlock code={PURCHASE_COMPLETED} title="When purchase is successful" />
              </div>

              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Code className="w-4 h-4 text-cyan-400" />
                  Custom Event
                </h4>
                <CodeBlock code={CUSTOM_EVENT} title="Track any custom event" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-amber-400 border-amber-500/30">
                  Vanilla JS
                </Badge>
                <h4 className="font-medium">Full HTML/JS Integration</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Complete example for standard websites
              </p>
              <CodeBlock code={FULL_INTEGRATION} language="html" title="index.html" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-blue-400 border-blue-500/30">
                  React
                </Badge>
                <h4 className="font-medium">React Hook Integration</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                TypeScript hook for React applications
              </p>
              <CodeBlock code={REACT_INTEGRATION} language="typescript" title="hooks/useConversionTracking.ts" />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
