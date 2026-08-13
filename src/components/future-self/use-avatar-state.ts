import { hasContributedToday } from '@/domain/streak';
import { select, useFuture } from '@/store/future-store';
import type { AvatarState } from '@/theme';

/**
 * Reads the character's mood off the store.
 *
 * Kept in one place so every screen showing Future You shows the *same* Future You. If
 * Today said they were proud while the Future tab said they were sad, the character
 * would stop reading as a person and start reading as decoration.
 *
 * Each field is a selector-scoped subscription, so a portfolio tick does not re-render
 * the avatar and a streak tick does not re-render the projection table. The returned
 * object is left for the React Compiler to memoise — a hand-written `useMemo` here is
 * something it cannot verify, and it refuses to compile around one.
 */
export function useAvatarState(): AvatarState {
  const streak = useFuture(select.streak);
  const today = useFuture(select.today);
  const event = useFuture(select.event);

  return {
    streak: streak.current,
    // A zero streak only means "broken" for someone who had one to lose; a brand new
    // user has not failed at anything yet.
    streakBroken: streak.current === 0 && streak.longest > 0,
    investedToday: hasContributedToday(streak, today),
    milestoneReached: event?.kind === 'milestone' ? event.milestone : null,
  };
}
