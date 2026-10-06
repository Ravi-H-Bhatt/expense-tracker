-- FAST CSV Export Query - All Ujjain Trip Data
-- Copy result and paste into Excel/CSV

-- Complete expense and split data
WITH ujjain_group AS (
  SELECT id FROM split_groups WHERE name ILIKE '%ujjain%' LIMIT 1
)
SELECT 
  ge.id as expense_id,
  ge.description as expense_name,
  ge.total_amount,
  ge.paid_by_name as who_paid,
  ge.is_group_fund_expense,
  to_char(ge.created_at, 'YYYY-MM-DD') as expense_date,
  es.id as split_id,
  es.display_name as who_owes,
  es.amount_owed,
  es.is_settled,
  to_char(es.created_at, 'YYYY-MM-DD HH24:MI:SS') as split_created,
  -- Calculate if this is old or new train split
  CASE 
    WHEN ge.description ILIKE '%train%' AND es.amount_owed = 3013.00 THEN 'OLD_TRAIN_DELETE'
    WHEN ge.description ILIKE '%train%' AND es.amount_owed = 1506.50 THEN 'NEW_TRAIN_KEEP'
    ELSE 'NORMAL'
  END as split_type
FROM group_expenses ge
JOIN expense_splits es ON ge.id = es.expense_id
JOIN ujjain_group ug ON ge.group_id = ug.id
ORDER BY ge.created_at, es.display_name;

-- Summary totals
WITH ujjain_group AS (
  SELECT id FROM split_groups WHERE name ILIKE '%ujjain%' LIMIT 1
)
SELECT 
  'SUMMARY' as type,
  COUNT(DISTINCT ge.id) as total_expenses,
  SUM(DISTINCT ge.total_amount) as total_expense_amount,
  COUNT(es.id) as total_splits,
  SUM(es.amount_owed) as total_splits_amount
FROM group_expenses ge
JOIN expense_splits es ON ge.id = es.expense_id
JOIN ujjain_group ug ON ge.group_id = ug.id;

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

-- STEP 2: Delete old Train splits (if they exist as 2-way splits)
-- WARNING: Only run this after confirming which splits to delete from above query
/*
DELETE FROM expense_splits 
WHERE expense_id IN (
  SELECT ge.id FROM group_expenses ge
  JOIN split_groups sg ON ge.group_id = sg.id
  WHERE sg.name ILIKE '%ujjain%' AND ge.description ILIKE '%train%'
) 
AND amount_owed = 3013.00;  -- Only delete the old 2-way splits
*/

-- STEP 3: Show corrected splits after cleanup
WITH ujjain_group AS (
  SELECT id FROM split_groups WHERE name ILIKE '%ujjain%' LIMIT 1
)
SELECT 
  'CORRECTED_SPLITS' as section,
  ge.description as expense,
  ge.total_amount as expense_total,
  es.display_name,
  es.amount_owed,
  es.is_settled,
  to_char(ge.created_at, 'Mon DD') as created
FROM expense_splits es
JOIN group_expenses ge ON es.expense_id = ge.id
JOIN ujjain_group ug ON ge.group_id = ug.id
WHERE sg.name ILIKE '%ujjain%'
ORDER BY ge.created_at, es.display_name;

-- STEP 4: Calculate correct balances after cleanup
WITH ujjain_group AS (
  SELECT id FROM split_groups WHERE name ILIKE '%ujjain%' LIMIT 1
),
member_payments AS (
  SELECT 
    ge.paid_by_name as member_name,
    SUM(ge.total_amount) as total_paid
  FROM group_expenses ge, ujjain_group ug
  WHERE ge.group_id = ug.id 
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
)
SELECT 
  'FINAL_CORRECTED_BALANCES' as section,
  COALESCE(mp.member_name, mo.member_name) as member_name,
  COALESCE(mp.total_paid, 0) as paid,
  COALESCE(mo.total_owes, 0) as owes,
  COALESCE(mp.total_paid, 0) - COALESCE(mo.total_owes, 0) as net_balance
FROM member_payments mp
FULL OUTER JOIN member_owes mo ON mp.member_name = mo.member_name
ORDER BY net_balance DESC;