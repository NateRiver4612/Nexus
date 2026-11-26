# Frontend

## SSR-safe media queries

### Symptom

A component that reads `window.matchMedia` to decide layout broke during server render (no
`window` on the server), and guarded versions could still throw a hydration mismatch — the
server painted one branch and the first client render picked another, causing a visible flicker.

### Root cause

Reading the query with `useState` + `useEffect` makes the correct value appear only on the
second render, so anything branching on it before hydration renders the server's default. And
reading `window` at init/module time throws outright during SSR.

### Fix

`useMediaQuery` (`apps/web/hooks/useMediaQuery.ts`) goes through `useSyncExternalStore` and
supplies a server snapshot of `false`. `getServerSnapshot` is used for SSR _and_ the first
hydration render, so server and client agree on `false`; React then swaps in the real match
after hydration and re-reads it on every `change`. The initial `false` is the deliberate
tradeoff — pick your breakpoint so the server-safe answer is the collapsed/mobile default.

### Verify

Toggle the breakpoint in devtools: no hydration warning in the console, and the value flips
after hydration without a mismatch.

## Chat re-rendering on view-mode switch

### Symptom

Switching the artifact view mode (split ↔ replace) or opening/closing the artifact panel made
the whole AI conversation re-render — with a reply streaming, the message list re-rendered on
every mode change, and the extra work showed up as stutter during the panel transition.

### Root cause

The view mode is state owned by the assistant panel, so changing it re-rendered the parent and,
with it, `ChatPanel`. `ChatPanel` wasn't memoized, and the artifact callbacks it received
(`onOpenArtifact`, etc.) were recreated on each parent render — so adding `memo` alone wouldn't
have helped, because a new callback prop breaks the shallow compare.

### Fix

- `ChatPanel` is wrapped in `memo`.
- Artifact-panel state moved into `useArtifactPanel`, which returns its callbacks from
  `useCallback` (`openArtifact`, `closePanel`, `togglePanel`, `clearSelection`, `resetArtifact`,
  `onArtifactResize`, `onGroupLayoutChanged`), so their identities are stable across mode
  changes and the memo can bail out.
- The tab switcher reads its active mode from context and the header element is memoized, so
  switching Note ↔ AI hides the inactive pane with `invisible` instead of re-rendering or
  remounting `ChatPanel` (which would drop the stream and scroll position).

### Verify

With a reply streaming, toggle split/replace and open/close the artifact panel — the message list
keeps its DOM and scroll, and the stream doesn't restart. React DevTools "Highlight updates"
shouldn't flash the chat on mode changes.
