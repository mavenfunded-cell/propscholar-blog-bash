/**
 * PropScholar Conversion Tracker
 * Lightweight, privacy-focused conversion tracking
 * ~12KB minified
 */
(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    endpoint: 'https://tisijoiblvcrigwhzprn.supabase.co/functions/v1/track-conversion',
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    heartbeatInterval: 30 * 1000, // 30 seconds
    scrollThresholds: [25, 50, 75, 100],
    idleTimeout: 60 * 1000, // 60 seconds for idle detection
    debug: false
  };

  // Storage keys
  const KEYS = {
    anonymousId: 'ps_anon_id',
    sessionId: 'ps_session_id',
    sessionStart: 'ps_session_start',
    pageStart: 'ps_page_start',
    scrollReached: 'ps_scroll_reached',
    cart: 'ps_cart',
    email: 'ps_user_email'
  };

  // Generate unique IDs
  function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  // Get or create anonymous ID (persists across sessions)
  function getAnonymousId() {
    let id = localStorage.getItem(KEYS.anonymousId);
    if (!id) {
      id = generateId();
      localStorage.setItem(KEYS.anonymousId, id);
    }
    return id;
  }

  // Get or create session ID (expires after inactivity)
  function getSessionId() {
    const now = Date.now();
    const sessionStart = parseInt(sessionStorage.getItem(KEYS.sessionStart) || '0');
    let sessionId = sessionStorage.getItem(KEYS.sessionId);

    if (!sessionId || (now - sessionStart > CONFIG.sessionTimeout)) {
      sessionId = generateId();
      sessionStorage.setItem(KEYS.sessionId, sessionId);
      sessionStorage.setItem(KEYS.sessionStart, now.toString());
    } else {
      sessionStorage.setItem(KEYS.sessionStart, now.toString());
    }
    return sessionId;
  }

  // State
  const state = {
    anonymousId: getAnonymousId(),
    sessionId: getSessionId(),
    pageStartTime: Date.now(),
    scrollReached: JSON.parse(sessionStorage.getItem(KEYS.scrollReached + '_' + window.location.pathname) || '[]'),
    lastActivity: Date.now(),
    idleWarningShown: false,
    checkoutPage: false
  };

  // Store page start time
  sessionStorage.setItem(KEYS.pageStart, state.pageStartTime.toString());

  // Send event to backend
  async function sendEvent(eventType, metadata = {}) {
    const payload = {
      anonymous_id: state.anonymousId,
      session_id: state.sessionId,
      event_type: eventType,
      page_url: window.location.href,
      page_title: document.title,
      timestamp: new Date().toISOString(),
      time_on_page_seconds: Math.round((Date.now() - state.pageStartTime) / 1000),
      referrer: document.referrer || null,
      user_agent: navigator.userAgent,
      metadata: metadata
    };

    // Add email if captured
    const email = localStorage.getItem(KEYS.email);
    if (email) {
      payload.user_email = email;
    }

    if (CONFIG.debug) {
      console.log('[PS Track]', eventType, payload);
    }

    try {
      const response = await fetch(CONFIG.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      });
      return response.ok;
    } catch (e) {
      if (CONFIG.debug) console.error('[PS Track] Error:', e);
      return false;
    }
  }

  // Track page view
  function trackPageView() {
    sendEvent('page_viewed', {
      landing_page: sessionStorage.getItem('ps_landing') ? false : true
    });
    if (!sessionStorage.getItem('ps_landing')) {
      sessionStorage.setItem('ps_landing', window.location.pathname);
    }
  }

  // Track scroll depth
  function trackScroll() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 100;

    for (const threshold of CONFIG.scrollThresholds) {
      if (scrollPercent >= threshold && !state.scrollReached.includes(threshold)) {
        state.scrollReached.push(threshold);
        sessionStorage.setItem(KEYS.scrollReached + '_' + window.location.pathname, JSON.stringify(state.scrollReached));
        sendEvent('scroll_depth', { depth: threshold });
      }
    }
  }

  // Throttled scroll handler
  let scrollTimeout;
  function handleScroll() {
    if (scrollTimeout) return;
    scrollTimeout = setTimeout(() => {
      trackScroll();
      scrollTimeout = null;
    }, 200);
  }

  // Track time on page (heartbeat)
  function startHeartbeat() {
    setInterval(() => {
      state.sessionId = getSessionId(); // Refresh session
    }, CONFIG.heartbeatInterval);
  }

  // Track page unload
  function trackUnload() {
    const timeOnPage = Math.round((Date.now() - state.pageStartTime) / 1000);
    sendEvent('page_exit', { time_on_page_seconds: timeOnPage });
  }

  // Idle detection for checkout pages
  function setupIdleDetection() {
    const isCheckout = window.location.pathname.includes('checkout') || 
                       window.location.pathname.includes('cart') ||
                       window.location.pathname.includes('payment');
    
    if (!isCheckout) return;
    
    state.checkoutPage = true;

    const resetIdle = () => {
      state.lastActivity = Date.now();
      state.idleWarningShown = false;
    };

    ['mousemove', 'keypress', 'scroll', 'click', 'touchstart'].forEach(event => {
      document.addEventListener(event, resetIdle, { passive: true });
    });

    setInterval(() => {
      if (state.checkoutPage && Date.now() - state.lastActivity > CONFIG.idleTimeout && !state.idleWarningShown) {
        state.idleWarningShown = true;
        sendEvent('checkout_idle', { idle_seconds: CONFIG.idleTimeout / 1000 });
        
        // Optional: Show nudge (can be customized)
        if (window.PSTrackConfig && window.PSTrackConfig.showNudge) {
          showNudge();
        }
      }
    }, 5000);
  }

  // Show help nudge
  function showNudge() {
    if (document.getElementById('ps-nudge')) return;
    
    const nudge = document.createElement('div');
    nudge.id = 'ps-nudge';
    nudge.innerHTML = `
      <div style="position:fixed;bottom:20px;right:20px;background:#1a1a2e;color:#fff;padding:16px 20px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.3);z-index:9999;font-family:system-ui;font-size:14px;max-width:300px;animation:ps-slide-in 0.3s ease-out">
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:24px">🤔</span>
          <div>
            <div style="font-weight:600;margin-bottom:4px">Need help?</div>
            <div style="opacity:0.8;font-size:13px">Questions about checkout? We're here to help.</div>
          </div>
          <button onclick="this.parentElement.parentElement.remove()" style="background:none;border:none;color:#fff;opacity:0.6;cursor:pointer;font-size:18px;padding:0;margin-left:8px">&times;</button>
        </div>
      </div>
      <style>@keyframes ps-slide-in{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}</style>
    `;
    document.body.appendChild(nudge);
    
    setTimeout(() => nudge.remove(), 10000);
  }

  // Public API
  window.PSTrack = {
    // Capture user email
    identify: function(email) {
      if (email && email.includes('@')) {
        localStorage.setItem(KEYS.email, email);
        sendEvent('email_captured', { email });
      }
    },

    // Track product view
    productViewed: function(product) {
      sendEvent('product_viewed', {
        product_name: product.name,
        account_size: product.accountSize,
        price: product.price,
        platform_type: product.platform
      });
    },

    // Add to cart
    addToCart: function(product) {
      const cart = JSON.parse(localStorage.getItem(KEYS.cart) || '[]');
      const item = {
        id: generateId(),
        product_name: product.name,
        account_size: product.accountSize,
        price: product.price,
        discount_applied: product.discount || 0,
        platform_type: product.platform,
        added_at: new Date().toISOString()
      };
      cart.push(item);
      localStorage.setItem(KEYS.cart, JSON.stringify(cart));

      sendEvent('add_to_cart', item);
    },

    // Remove from cart
    removeFromCart: function(productId) {
      let cart = JSON.parse(localStorage.getItem(KEYS.cart) || '[]');
      const removed = cart.find(item => item.id === productId);
      cart = cart.filter(item => item.id !== productId);
      localStorage.setItem(KEYS.cart, JSON.stringify(cart));

      if (removed) {
        sendEvent('remove_from_cart', removed);
      }
    },

    // Checkout started
    checkoutStarted: function() {
      const cart = JSON.parse(localStorage.getItem(KEYS.cart) || '[]');
      sendEvent('checkout_started', {
        cart_items: cart,
        cart_value: cart.reduce((sum, item) => sum + (item.price - (item.discount_applied || 0)), 0)
      });
    },

    // Checkout abandoned
    checkoutAbandoned: function(reason) {
      const cart = JSON.parse(localStorage.getItem(KEYS.cart) || '[]');
      sendEvent('checkout_abandoned', {
        cart_items: cart,
        cart_value: cart.reduce((sum, item) => sum + (item.price - (item.discount_applied || 0)), 0),
        reason: reason || 'unknown',
        time_on_page_seconds: Math.round((Date.now() - state.pageStartTime) / 1000)
      });
    },

    // Purchase completed
    purchaseCompleted: function(orderData) {
      const cart = JSON.parse(localStorage.getItem(KEYS.cart) || '[]');
      sendEvent('purchase_completed', {
        order_id: orderData.orderId,
        cart_items: cart,
        total_value: orderData.total || cart.reduce((sum, item) => sum + (item.price - (item.discount_applied || 0)), 0)
      });
      localStorage.removeItem(KEYS.cart); // Clear cart
    },

    // Get current cart
    getCart: function() {
      return JSON.parse(localStorage.getItem(KEYS.cart) || '[]');
    },

    // Clear cart
    clearCart: function() {
      localStorage.removeItem(KEYS.cart);
    },

    // Custom event
    track: function(eventName, metadata) {
      sendEvent(eventName, metadata);
    },

    // Get anonymous ID (for debugging)
    getAnonymousId: function() {
      return state.anonymousId;
    },

    // Enable debug mode
    debug: function(enabled = true) {
      CONFIG.debug = enabled;
    }
  };

  // Auto-detect email inputs
  function observeEmailInputs() {
    document.querySelectorAll('input[type="email"], input[name="email"]').forEach(input => {
      if (input.dataset.psTracked) return;
      input.dataset.psTracked = 'true';
      
      input.addEventListener('blur', () => {
        if (input.value && input.value.includes('@')) {
          window.PSTrack.identify(input.value);
        }
      });
    });
  }

  // Initialize
  function init() {
    trackPageView();
    startHeartbeat();
    setupIdleDetection();
    observeEmailInputs();

    // Observe for dynamically added email inputs
    const observer = new MutationObserver(observeEmailInputs);
    observer.observe(document.body, { childList: true, subtree: true });

    // Track scroll
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Track unload
    window.addEventListener('beforeunload', trackUnload);
    window.addEventListener('pagehide', trackUnload);

    // Detect checkout abandonment on navigation
    window.addEventListener('beforeunload', () => {
      if (state.checkoutPage) {
        const cart = JSON.parse(localStorage.getItem(KEYS.cart) || '[]');
        if (cart.length > 0) {
          window.PSTrack.checkoutAbandoned('page_exit');
        }
      }
    });

    if (CONFIG.debug) {
      console.log('[PS Track] Initialized', { anonymousId: state.anonymousId, sessionId: state.sessionId });
    }
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
