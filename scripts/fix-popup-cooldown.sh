#!/bin/bash
# Quick fix script for popup cooldown issue
# This will reduce the reminder_due cooldown from 15 minutes to 30 seconds

echo "🔧 Fixing popup cooldown issue..."
echo ""
echo "Issue: Second reminder popup blocked by 15-minute cooldown"
echo "Solution: Reduce cooldown to 30 seconds"
echo ""

# Option 1: Run SQL via Supabase CLI
if command -v supabase &> /dev/null; then
    echo "Running fix via Supabase CLI..."
    supabase db execute --file supabase/migrations/20250123000001_reduce_reminder_cooldown.sql
    echo "✅ Cooldown reduced to 30 seconds"
else
    echo "⚠️  Supabase CLI not found. Please run this SQL manually:"
    echo ""
    echo "----------------------------------------"
    cat supabase/migrations/20250123000001_reduce_reminder_cooldown.sql
    echo "----------------------------------------"
    echo ""
    echo "Copy the SQL above and run it in:"
    echo "1. Supabase Dashboard → SQL Editor"
    echo "2. Or your database client"
fi

echo ""
echo "📊 After running, check the debug endpoint:"
echo "curl https://your-app/api/popups/debug?hours=1"
echo ""
echo "✅ Next reminder popups will appear within 30 seconds of each other!"
