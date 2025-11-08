# Presence Integration Setup

This branch contains the full implementation of real-time user presence tracking for the Delphi event management app.

## What's Been Implemented

### Backend (Convex)
- ✅ `web/convex/convex.config.ts` - Added presence component configuration
- ✅ `web/convex/presence.ts` - Complete presence tracking functions:
  - `updatePresence` - Heartbeat mutation with context awareness
  - `listPresenceByContext` - Query users by room/event/global context
  - `leaveLocation` - Cleanup mutation when users leave
  - `getUserPresence` - Check if specific user is online
  - `getEventPresenceStats` - Event-wide presence statistics

### Frontend
- ✅ `web/src/hooks/usePresence.ts` - Main presence hook with:
  - Automatic context detection from URL params
  - 30-second heartbeat interval
  - Automatic cleanup on unmount
  - Support for typing indicators
  - Additional hooks: `usePresenceByContext`, `useUserPresence`, `useEventPresenceStats`

### UI Components (`web/src/components/presence/`)
- ✅ `PresenceIndicator.tsx` - Status indicator dot (green/yellow/blue with pulse)
- ✅ `PresenceAvatarStack.tsx` - Overlapping avatar display (max 5 visible + count badge)
- ✅ `PresenceDropdown.tsx` - Detailed user list with popover
- ✅ `PresenceDisplay.tsx` - Main component combining everything
- ✅ `index.ts` - Centralized exports

### Integration
- ✅ `web/src/routes/_authed.tsx` - Integrated `PresenceDisplay` into `SidebarAwareHeader`

## How Presence Works

### Context-Aware Tracking
The system automatically detects where the user is:
- **Room context**: When viewing `/events/$eventId/rooms/$roomId` - shows room participants
- **Event context**: When viewing `/events/$eventId` - shows event participants
- **Global context**: When viewing `/dashboard` - shows all online users

### Heartbeat System
- Client sends heartbeat every 30 seconds
- Server expires presence after 45 seconds of no heartbeat
- Automatic cleanup when user navigates away or closes tab

### UI Features
- Avatar stack with online indicators
- Click to see detailed list in dropdown
- Typing indicators (ready for chat integration)
- Responsive design (hides on mobile if needed)
- Smooth animations and transitions

## Testing Instructions

### 1. Start Convex Development Server
```bash
cd web
npx convex dev
```

This will:
- Register the presence component
- Generate TypeScript types
- Watch for changes

### 2. Start Development Server
In a new terminal:
```bash
cd web
bun run dev
```

### 3. Test Presence
1. Open the app in multiple browser windows/tabs
2. Sign in with different users
3. Navigate to a room (`/events/[eventId]/rooms/[roomId]`)
4. You should see avatars appear in the header as users join
5. Switch rooms to see presence update
6. Close a tab and watch the user disappear after 45 seconds

### 4. Multi-User Testing
- Use different browsers (Chrome, Firefox, Safari, Incognito)
- Or use different devices
- Verify presence appears/disappears correctly
- Check that typing indicators work (when integrated with chat)

## Build Verification

After starting Convex dev:
```bash
cd web
bun run build
```

This should complete successfully once Convex types are generated.

## Future Enhancements

The implementation is designed to be extensible:

### 1. Typing Indicators in Chat
```typescript
// In your chat component
const { setTyping } = usePresence();

const handleTyping = () => {
  setTyping(true);
  // Debounce logic...
  setTimeout(() => setTyping(false), 3000);
};
```

### 2. Event Dashboard Widget
```typescript
// Show event-wide presence on dashboard
import { useEventPresenceStats } from "@/hooks/usePresence";

const stats = useEventPresenceStats(eventId);
// stats.totalActiveUsers, stats.rooms (per-room breakdown)
```

### 3. Global Presence View
The system already supports global presence - just need to add a UI component:
```typescript
const globalUsers = usePresenceByContext({ type: "global" });
```

### 4. User Status Messages
Backend already has `data` field support - can be extended to:
- Custom status messages ("In a meeting", "Brainstorming")
- Activity indicators ("Viewing budget", "Editing tasks")
- Away/DND states

### 5. Notifications
Integrate with notification system to:
- Alert when specific users come online
- Notify coordinators when vendors become available
- Show "X joined the room" messages

## Architecture Notes

### Authorization
- All presence queries verify user has access to the context
- Room presence requires `requireRoomParticipant`
- Event presence requires `requireEventMember`
- Global presence requires authentication only

### Performance
- Presence component handles expiry automatically
- Heartbeat interval optimized for balance (30s)
- Max 5 avatars shown in stack (performance + UX)
- Dropdown scrolls for large user lists

### Error Handling
- All mutations catch and log errors
- Failed heartbeats don't crash the app
- Network interruptions handled gracefully

## Troubleshooting

### Users appear offline despite being active
- Check heartbeat interval (30s) vs expiry (45s)
- Verify network connectivity
- Check browser console for errors

### Build fails
- Ensure `npx convex dev` is running
- Check that `_generated/api.ts` exists
- Verify all imports are correct

### Presence flickers
- Might need to increase expiry time in `web/convex/presence.ts`
- Check for network latency issues

## Files Changed

```
web/
├── convex/
│   ├── convex.config.ts          [Modified] Added presence component
│   └── presence.ts                [New] Presence backend functions
├── src/
│   ├── components/
│   │   └── presence/              [New] All presence UI components
│   │       ├── PresenceIndicator.tsx
│   │       ├── PresenceAvatarStack.tsx
│   │       ├── PresenceDropdown.tsx
│   │       ├── PresenceDisplay.tsx
│   │       └── index.ts
│   ├── hooks/
│   │   └── usePresence.ts         [New] Presence React hooks
│   └── routes/
│       └── _authed.tsx            [Modified] Added PresenceDisplay to header
├── package.json                   [Modified] Added @convex-dev/presence
└── bun.lock                       [Modified] Lock file update
```

## Next Steps

1. ✅ **Run** `npx convex dev` to register the component
2. ✅ **Test** with multiple browser windows
3. ⏭️ **Integrate** typing indicators in chat rooms (future)
4. ⏭️ **Add** event dashboard presence widget (future)
5. ⏭️ **Enhance** with custom status messages (future)

## Ready to Merge

Once tested:
1. Verify all presence features work
2. Run build successfully
3. Create PR from `feature/presence-integration` to `main`
4. Include screenshots of presence working in multiple contexts

---

**Implementation Date:** 2025-11-06
**Branch:** `feature/presence-integration`
**Worktree:** `../delphi-presence/`
