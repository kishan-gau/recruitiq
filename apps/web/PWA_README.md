# Progressive Web App (PWA) Implementation

This document describes the PWA implementation for RecruitIQ's unified web application.

## Overview

RecruitIQ now functions as a Progressive Web App, providing an app-like experience for employees on mobile and desktop devices. The implementation follows the recommendations in [docs/mobile/EMPLOYEE_MOBILE_UX_PROPOSAL.md](../../docs/mobile/EMPLOYEE_MOBILE_UX_PROPOSAL.md).

## Key Features

### 🚀 Installable
Users can install RecruitIQ on their device home screen for quick access, just like a native app.

### 📱 Mobile-First Design
Adaptive layout that switches between:
- **Desktop**: Sidebar navigation for power users
- **Mobile**: Bottom navigation bar for thumb-friendly access

### ⚡ Offline Support
Service worker caches static assets and API responses, allowing the app to work even without internet connection.

### 🎯 Touch-Optimized
All interactive elements meet minimum touch target sizes (60x60pt) with iOS/Android optimizations.

### 🔔 Smart Install Prompt
Non-intrusive banner prompts users to install the app after they've used it.

## Architecture

### Components

```
src/
├── serviceWorker.ts              # Service worker registration
├── components/
│   ├── InstallPWAPrompt.tsx     # Install prompt banner
│   └── ui/
│       └── Skeleton.tsx         # Loading skeletons
├── hooks/
│   └── useMobile.ts             # Mobile detection hooks
└── shared/
    └── layouts/
        ├── AdaptiveLayout.tsx   # Auto-switching layout
        ├── MainLayout.tsx       # Desktop layout
        └── MobileLayout.tsx     # Mobile layout with bottom nav
```

### Configuration

**vite.config.ts**
```typescript
VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    name: 'RecruitIQ Employee Portal',
    short_name: 'RecruitIQ',
    theme_color: '#0ea5e9',
    display: 'standalone',
    // ...icons configuration
  },
  workbox: {
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/api\.recruitiq\.com\/.*/i,
        handler: 'NetworkFirst',
        // 24-hour cache fallback
      }
    ]
  }
})
```

### Mobile Hooks

```typescript
// Detect mobile screen size
const isMobile = useIsMobile(); // <768px

// Detect if running as installed PWA
const isPWA = useIsPWA();

// Get device orientation
const orientation = useOrientation(); // 'portrait' | 'landscape'
```

## Development

### Running in Development

```bash
npm run dev
```

Service worker runs in development mode for easier testing.

### Building for Production

```bash
npm run build
```

Generates:
- `dist/sw.js` - Service worker
- `dist/manifest.webmanifest` - PWA manifest
- `dist/workbox-*.js` - Workbox runtime

### Testing PWA Features

See [PWA_TESTING_GUIDE.md](./PWA_TESTING_GUIDE.md) for detailed testing instructions.

## Browser Support

| Browser | Version | PWA Support | Notes |
|---------|---------|-------------|-------|
| Chrome | 90+ | ✅ Full | Best experience |
| Firefox | 90+ | ⚠️ Limited | No install prompt |
| Safari | 16.4+ | ⚠️ Limited | iOS restrictions |
| Edge | 90+ | ✅ Full | Chromium-based |

## Deployment Requirements

### HTTPS Required
PWA features only work over HTTPS. For local development, `localhost` is treated as secure.

### Headers
Ensure your server sends these headers:

```nginx
# Service worker scope
Service-Worker-Allowed: /

# Cache control for manifest
Cache-Control: no-cache  # for manifest.webmanifest
```

### Example Nginx Configuration

```nginx
location / {
  try_files $uri $uri/ /index.html;
  
  # PWA headers
  add_header Service-Worker-Allowed /;
  
  # Cache static assets
  location ~* \.(js|css|png|jpg|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
  
  # Don't cache manifest or service worker
  location ~* (manifest\.webmanifest|sw\.js)$ {
    add_header Cache-Control "no-cache";
  }
}
```

## Mobile Layout Breakpoints

Following Tailwind CSS defaults:

```css
/* Mobile first */
@media (max-width: 767px)   /* Mobile layout with bottom nav */
@media (min-width: 768px)   /* Desktop layout with sidebar */
@media (min-width: 1024px)  /* Large desktop */
```

## Safe Area Insets

For notched devices (iPhone X and newer):

```css
.safe-area-inset-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
```

Applied to bottom navigation to avoid home indicator overlap.

## Performance

### Lighthouse Scores (Target)
- **Performance**: >90
- **PWA**: >90
- **Accessibility**: >90
- **Best Practices**: >90

### Bundle Size
- Main: ~369 KB (~109 KB gzipped)
- Initial load: <200 KB (code-split)

### Caching Strategy
- **Static assets**: Precached (instant load)
- **API calls**: NetworkFirst with 24h cache fallback
- **Images**: Cache-first with expiration

## Troubleshooting

### Service Worker Not Updating
```bash
# Clear old service workers
chrome://serviceworker-internals/

# Force update
localStorage.clear();
```

### Install Prompt Not Showing
- Check HTTPS is enabled
- Verify manifest is valid
- Clear `pwa-install-dismissed` from localStorage
- Must meet all PWA criteria

### iOS Installation
1. Open in Safari
2. Tap Share button
3. Tap "Add to Home Screen"
4. App opens in standalone mode

## Future Enhancements

### Phase 3 (Planned)
- [ ] Push notifications
- [ ] Biometric authentication
- [ ] Advanced offline scenarios
- [ ] Background sync
- [ ] Pull-to-refresh

### Employee Features (Planned)
- [ ] Quick clock-in widget
- [ ] Schedule view optimization
- [ ] Payslip offline access
- [ ] Location-based features

## Resources

### Documentation
- [PWA Proposal](../../docs/mobile/EMPLOYEE_MOBILE_UX_PROPOSAL.md)
- [Testing Guide](./PWA_TESTING_GUIDE.md)

### External Links
- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)
- [Workbox](https://developer.chrome.com/docs/workbox/)
- [Apple PWA Guidelines](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)

## Support

For issues or questions:
1. Check [PWA_TESTING_GUIDE.md](./PWA_TESTING_GUIDE.md)
2. Review browser console for errors
3. Test in Chrome DevTools PWA mode
4. Open an issue with:
   - Browser and version
   - Device and OS
   - Steps to reproduce
   - Console errors (if any)
