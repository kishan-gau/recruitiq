# PWA Implementation - Testing Guide

## What's Been Implemented

Based on the Employee Mobile UX Proposal (docs/mobile/EMPLOYEE_MOBILE_UX_PROPOSAL.md), we have implemented a Progressive Web App (PWA) with mobile-first design principles for RecruitIQ.

## Features Implemented

### Phase 1: PWA Foundation ✅
- **Service Worker**: Automatic registration with offline caching and background sync
- **Web App Manifest**: Configured with app icons, theme colors, and metadata
- **App Icons**: SVG icons in multiple sizes (72x72 to 512x512)
- **Offline Support**: NetworkFirst caching strategy for API calls, cache-first for static assets
- **PWA Meta Tags**: Apple-specific tags for iOS compatibility

### Phase 2: Mobile-First Layout ✅
- **Adaptive Layout**: Automatically switches between desktop and mobile layouts based on screen size
- **Mobile Layout**: Bottom navigation bar with touch-optimized targets (60x60pt minimum)
- **Bottom Navigation**: Home, Schedule, Pay, Profile sections
- **Safe Area Insets**: Support for notched devices (iPhone X and newer)
- **Touch Optimizations**: 
  - `touch-manipulation` to disable 300ms tap delay
  - Removed tap highlight on iOS
  - Minimum 16px font size to prevent zoom on input focus
- **PWA Install Prompt**: Smart banner that prompts users to install the app
- **Loading Skeletons**: Improved perceived performance with skeleton screens

### Mobile Hooks
- `useIsMobile()`: Detects screen size (<768px)
- `useIsPWA()`: Detects if app is running as installed PWA
- `useOrientation()`: Tracks portrait/landscape orientation

## How to Test

### 1. Test PWA Installation (Desktop)

1. **Build the app**:
   ```bash
   cd apps/web
   npm run build
   ```

2. **Serve the production build**:
   ```bash
   npm run preview
   ```

3. **Open in Chrome**:
   - Navigate to http://localhost:4173
   - Open Chrome DevTools (F12)
   - Go to Application tab > Service Workers
   - Verify service worker is registered
   - Go to Application tab > Manifest
   - Verify manifest is loaded correctly

4. **Install the PWA**:
   - Look for the install prompt banner at the bottom
   - Click "Install" button
   - Verify app opens in standalone mode
   - Check that app icon appears in Applications/Start Menu

### 2. Test Mobile Layout

1. **Resize browser to mobile**:
   - Open Chrome DevTools (F12)
   - Click "Toggle device toolbar" (Ctrl+Shift+M)
   - Select iPhone 12 Pro or similar device
   - Verify bottom navigation appears
   - Verify touch targets are large enough

2. **Test on actual mobile device**:
   - Deploy to a staging server with HTTPS (required for PWA)
   - Open on iOS Safari or Android Chrome
   - Test install prompt
   - Verify bottom navigation works
   - Test safe area insets on notched devices

### 3. Test Offline Functionality

1. **In Chrome DevTools**:
   - Go to Application tab > Service Workers
   - Check "Offline" checkbox
   - Reload the page
   - Verify app still loads (cached assets)
   - Navigate between pages
   - Verify previously cached pages work offline

### 4. Run Lighthouse Audit

1. **In Chrome**:
   - Open Chrome DevTools (F12)
   - Go to Lighthouse tab
   - Select "Progressive Web App" category
   - Click "Generate report"
   - Target score: >90

2. **Expected results**:
   - ✅ Installable
   - ✅ PWA-optimized
   - ✅ Works offline
   - ✅ Service worker registered
   - ✅ Manifest configured
   - ✅ Icons provided
   - ✅ Theme color set

## Testing Checklist

### PWA Features
- [ ] Service worker registers successfully
- [ ] Manifest loads with correct metadata
- [ ] App icons display correctly
- [ ] Install prompt appears
- [ ] App installs successfully
- [ ] App runs in standalone mode
- [ ] Offline page loads when offline
- [ ] Cached pages work offline

### Mobile Layout
- [ ] Bottom navigation appears on mobile (<768px)
- [ ] Desktop sidebar appears on desktop (≥768px)
- [ ] Touch targets are 60x60pt minimum
- [ ] Safe area insets work on notched devices
- [ ] No zoom on input focus (iOS)
- [ ] Navigation is accessible and usable
- [ ] Layout switches smoothly on resize

### Performance
- [ ] Lighthouse PWA score >90
- [ ] First Contentful Paint <1.8s
- [ ] Time to Interactive <3.5s
- [ ] Service worker caching reduces load times

## Known Limitations

### iOS Safari Limitations
- Limited service worker support (no background sync)
- Must add to home screen to fully install
- Some PWA features require iOS 16.4+

### Android Considerations
- Best experience on Chrome browser
- Install prompt may vary by browser
- Some manufacturers have custom browsers with limited PWA support

## Future Enhancements (Not Implemented)

As outlined in the proposal, these features can be added in future phases:
- Push notifications
- Biometric authentication
- Advanced offline scenarios
- Background sync for offline actions
- Pull-to-refresh functionality
- Employee-specific features (clock-in widget, schedule views, etc.)

## Screenshots

### Desktop View with Install Prompt
![Desktop Login](https://github.com/user-attachments/assets/a23e2bb5-2be6-4303-be83-80cc0181fd29)

### Mobile View with Bottom Navigation
![Mobile Login](https://github.com/user-attachments/assets/8a7a64a1-d580-4c50-b39a-ddc5322c621c)

## Technical Details

### Service Worker Configuration
- Mode: `generateSW` (auto-generated by Workbox)
- Caching Strategy:
  - API calls: NetworkFirst (with 24-hour cache fallback)
  - Static assets: Cache-first (with precaching)
- Precached: ~130 entries (~1.07 MB)

### Bundle Size
- Main bundle: ~369 KB (gzipped: ~109 KB)
- Service worker: ~8.6 KB
- Workbox runtime: ~22.6 KB

### Browser Support
- Chrome 90+ (full support)
- Firefox 90+ (limited PWA features)
- Safari 16.4+ (limited PWA features)
- Edge 90+ (full support)

## Troubleshooting

### Service Worker Not Registering
- Ensure HTTPS is enabled (required for PWA)
- Check browser console for errors
- Clear browser cache and reload

### Install Prompt Not Showing
- Must meet PWA criteria (manifest, service worker, HTTPS)
- User may have dismissed it before
- Check localStorage for 'pwa-install-dismissed' key

### Offline Not Working
- Service worker must be registered first
- Visit pages once while online to cache them
- Check Network tab in DevTools (offline mode)

## Resources

- [PWA Proposal](../../docs/mobile/EMPLOYEE_MOBILE_UX_PROPOSAL.md)
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)
- [Workbox Documentation](https://developer.chrome.com/docs/workbox/)
- [Web.dev PWA Guide](https://web.dev/progressive-web-apps/)
