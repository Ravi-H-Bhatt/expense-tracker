-- Debug Ujjain Trip Math - Run in Supabase SQL Editor
-- This will show the REAL split data to understand the calculation

-- Show all group expenses for UJJAIN trip
SELECT 
  'EXPENSES' as section,
  ge.description,
  ge.total_amount,
  ge.paid_by_name,
  ge.is_group_fund_expense,
  ge.expense_date,
  to_char(ge.created_at, 'Mon DD') as created
FROM group_expenses ge
JOIN split_groups sg ON ge.group_id = sg.id
WHERE sg.name ILIKE '%ujjain%'
ORDER BY ge.created_at;

-- Show all splits for UJJAIN trip  
SELECT 
  'SPLITS' as section,
  ge.description as expense,
  ge.total_amount as expense_total,
  es.display_name,
  es.amount_owed,
  es.is_settled,
  to_char(ge.created_at, 'Mon DD') as created
FROM expense_splits es
JOIN group_expenses ge ON es.expense_id = ge.id
JOIN split_groups sg ON ge.group_id = sg.id
WHERE sg.name ILIKE '%ujjain%'
ORDER BY ge.created_at, es.display_name;

-- Calculate correct balances manually
WITH ujjain_group AS (
  SELECT id FROM split_groups WHERE name ILIKE '%ujjain%' LIMIT 1
),
member_payments AS (
  SELECT 
    ge.paid_by_name as member_name,
    SUM(ge.total_amount) as total_paid
  FROM group_expenses ge, ujjain_group ug
  WHERE ge.group_id = ug.id 
    AND NOT ge.is_group_fund_expense
  GROUP BY ge.paid_by_name
),
member_owes AS (
  SELECT 
    es.display_name as member_name,
    SUM(es.amount_owed) as total_owes
  FROM expense_splits es
  JOIN group_expenses ge ON es.expense_id = ge.id, ujjain_group ug
  WHERE ge.group_id = ug.id
  GROUP BY es.display_name
),
group_fund_expenses AS (
  SELECT 
    COALESCE(SUM(ge.total_amount), 0) as group_fund_total
  FROM group_expenses ge, ujjain_group ug
  WHERE ge.group_id = ug.id 
    AND ge.is_group_fund_expense
),
member_count AS (
  SELECT COUNT(*) as count
  FROM group_members gm, ujjain_group ug
  WHERE gm.group_id = ug.id
)
SELECT 
  'CORRECT BALANCES' as section,
  COALESCE(mp.member_name, mo.member_name) as member_name,
  COALESCE(mp.total_paid, 0) as paid,
  COALESCE(mo.total_owes, 0) + (gfe.group_fund_total / mc.count) as owes,
  COALESCE(mp.total_paid, 0) - (COALESCE(mo.total_owes, 0) + (gfe.group_fund_total / mc.count)) as net_balance
FROM member_payments mp
FULL OUTER JOIN member_owes mo ON mp.member_name = mo.member_name
CROSS JOIN group_fund_expenses gfe
CROSS JOIN member_count mc
ORDER BY net_balance DESC;

-- Summary stats
SELECT 
  'SUMMARY' as section,
  COUNT(*) as total_expenses,
  SUM(total_amount) as total_amount,
  SUM(CASE WHEN is_group_fund_expense THEN total_amount ELSE 0 END) as group_fund_spent,
  SUM(CASE WHEN NOT is_group_fund_expense THEN total_amount ELSE 0 END) as personal_expenses
FROM group_expenses ge
JOIN split_groups sg ON ge.group_id = sg.id
WHERE sg.name ILIKE '%ujjain%';