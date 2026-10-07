import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/audit-log'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { amount, category, notes, payment_method, expense_date } = body

    // Create expense
    const { data, error } = await supabase
      .from('expenses')
      .insert({
        user_id: user.id,
        amount: parseFloat(amount),
        category,
        notes: notes || null,
        payment_method: payment_method || null,
        expense_date,
      })
      .select()
      .single()

    if (error) throw error

    // Log activity
    await logActivity({
      action_type: 'expense_created',
      entity_type: 'expense',
      entity_id: data.id,
      metadata: {
        amount: parseFloat(amount),
        category,
        notes,
        payment_method,
        via_api: true
      }
    })

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Error creating expense:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create expense' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing expense ID' }, { status: 400 })
    }

    // Get expense details before deleting
    const { data: expense } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    // Delete expense
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    // Log activity
    if (expense) {
      await logActivity({
        action_type: 'expense_deleted',
        entity_type: 'expense',
        entity_id: id,
        metadata: {
          amount: expense.amount,
          category: expense.category,
          notes: expense.notes
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting expense:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete expense' },
      { status: 500 }
    )
  }
}
