import { FIXTURE, type PortfolioFixture } from '@/services/time-machine-api';
import { MIN_DAILY_AMOUNT, dateFromDayIndex } from '@/domain/simulation';
import { select, useFuture } from '@/store/future-store';

/**
 * The portfolio the Time Machine projects from.
 *
 * Reads the user's real holdings once they have any, and falls back to the seeded fixture
 * before that. A brand-new account has ₹0 and no history, which would make the whole
 * feature a flat line at zero — demonstrable to nobody. Falling back keeps the feature
 * reviewable on a fresh install without ever overwriting a real number with a fake one.
 */
export function useTimeMachinePortfolio(): PortfolioFixture {
  const portfolio = useFuture(select.portfolio);
  const profile = useFuture(select.profile);
  const today = useFuture(select.today);

  if (portfolio.invested <= 0) return FIXTURE;

  const thisYear = dateFromDayIndex(today).getFullYear();

  return {
    currentValue: portfolio.value,
    allTimeGain: portfolio.returns,
    allTimeGainPct:
      portfolio.invested > 0
        ? Math.round((portfolio.returns / portfolio.invested) * 1000) / 10
        : 0,
    dailySip: profile?.dailyAmount ?? MIN_DAILY_AMOUNT,
    invested: portfolio.invested,
    // No unit ledger in the domain — the simulation tracks rupees. Derived at a nominal
    // NAV purely so the row has something honest in it.
    units: portfolio.value / 210,
    borrowable: portfolio.availableToBorrow,
    startYear: thisYear,
    endYear: thisYear + 15,
    ageAtStart: profile?.age ?? FIXTURE.ageAtStart,
  };
}
