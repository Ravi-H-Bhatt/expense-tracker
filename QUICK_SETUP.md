# 🚀 Quick Setup Guide

## 1️⃣ Run Database Script (ONE TIME ONLY)

Open Supabase Dashboard → SQL Editor → Run this:

```sql
-- Enable realtime on group_members table
ALTER PUBLICATION supabase_realtime ADD TABLE group_members;

-- Sync existing display names
DO $$
DECLARE
  member_record RECORD;
BEGIN
  FOR member_record IN 
    SELECT gm.id, gm.user_id, gm.display_name, p.full_name
    FROM group_members gm
    LEFT JOIN profiles p ON p.id = gm.user_id
    WHERE p.full_name IS NOT NULL 
      AND p.full_name != ''
      AND p.full_name != gm.display_name
  LOOP
    UPDATE group_members 
    SET display_name = member_record.full_name 
    WHERE id = member_record.id;
  END LOOP;
END $$;
```

## 2️⃣ Start Server

```bash
npm run dev
```

Open: http://localhost:3000

## 3️⃣ Test Features

### ✅ Display Name Sync
1. Dashboard → Profile → Edit name → Save
2. Go to Splitwise → Any group → Summary tab
3. Check Balance Sheet - name should be updated!

### ✅ PDF Export
1. Splitwise → Any group → Summary tab
2. Click "Export PDF" button
3. Select month and year
4. Click "Generate Report"
5. PDF downloads with all analytics!

## ✨ All Features Working

- ✅ Display names sync across all groups
- ✅ Real-time updates (no refresh needed)
- ✅ Monthly PDF reports with analytics
- ✅ Payment requests with email notifications
- ✅ Settlement flow with confirmation
- ✅ AI expense tracking
- ✅ Mobile responsive design

## 🎉 Done!
