-- Refresh all multi-currency materialized views
-- Run this script periodically or after significant data changes

\c recruitiq

-- Refresh active exchange rates view (most frequently accessed)
REFRESH MATERIALIZED VIEW CONCURRENTLY payroll.active_exchange_rates_mv;

-- Refresh currency conversion summary (daily recommended)
REFRESH MATERIALIZED VIEW CONCURRENTLY payroll.currency_conversion_summary_mv;

-- Refresh exchange rate history (weekly recommended)
REFRESH MATERIALIZED VIEW CONCURRENTLY payroll.exchange_rate_history_mv;

-- Show refresh statistics
SELECT 
  schemaname,
  matviewname,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) as size,
  last_refresh
FROM pg_matviews
WHERE schemaname = 'payroll'
  AND matviewname LIKE '%currency%'
ORDER BY matviewname;
