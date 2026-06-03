/**
 * Balance Sheet Action Button Logic
 * Determines which action buttons to show based on balance and user role
 */

export interface BalanceData {
  name: string;
  paid: number;
  owes: number;
  net: number;
  userId: string;
}

export type ActionButtonType = 'request' | 'pay';

export interface ActionButton {
  label: string;
  type: ActionButtonType;
  disabled: boolean;
  title?: string;
}

/**
 * Determine action button for a balance sheet row
 * 
 * RULES:
 * - net = paid - owes
 * - net > 0: person is OWED money → they show "Request"
 * - net < 0: person OWES money → they show "Pay"
 * - net = 0: settled → no button
 * 
 * For current user's own row:
 *   - If net > 0 (I am owed): Show "Request" to ask others for my money
 *   - If net < 0 (I owe): No button on own row (see "Pay" on debtor's row instead)
 * 
 * For other members' rows:
 *   - If net > 0 (they are owed): Show "Request" to ask them
 *   - If net < 0 (they owe): Show "Pay" to send them payment
 */
export function getActionButton(
  member: BalanceData,
  currentUserId: string
): ActionButton | null {
  const net = member.net; // positive = owed, negative = owes

  // Current user's own row
  if (member.userId === currentUserId) {
    if (net > 0) {
      // I am owed money
      return {
        label: 'Request',
        type: 'request',
        disabled: false,
        title: `Request the ₹${Math.abs(net).toLocaleString('en-IN')} owed to me`
      };
    }
    // If I owe, no action button on my own row
    // (I'll see "Pay" button on the person's row who is owed)
    return null;
  }

  // Other member's row
  if (net < 0) {
    // This person owes money
    return {
      label: 'Pay',
      type: 'pay',
      disabled: false,
      title: `Send payment to ${member.name} for ₹${Math.abs(net).toLocaleString('en-IN')}`
    };
  } else if (net > 0) {
    // This person is owed money
    return {
      label: 'Request',
      type: 'request',
      disabled: false,
      title: `Request ₹${net.toLocaleString('en-IN')} from ${member.name}`
    };
  }

  // Settled (net = 0)
  return null;
}

/**
 * Get visual badge for balance status
 */
export function getBalanceBadge(net: number): {
  text: string;
  color: string;
  bgColor: string;
} {
  if (net > 0) {
    return {
      text: `+₹${net.toLocaleString('en-IN')}`,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    };
  } else if (net < 0) {
    return {
      text: `₹${Math.abs(net).toLocaleString('en-IN')}`,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    };
  }

  return {
    text: 'Settled',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50'
  };
}

/**
 * Get status text for balance
 */
export function getBalanceStatus(net: number): string {
  if (net > 0) return 'owed';
  if (net < 0) return 'owes';
  return 'settled';
}

/**
 * Calculate who owes who and how much
 * Useful for generating settlement recommendations
 */
export function calculateSettlements(
  balances: Record<string, BalanceData>
): Array<{
  from: string;
  to: string;
  amount: number;
  priority: number; // Higher number = higher priority
}> {
  const settlements = [];
  const members = Object.values(balances);

  // Find all debtors and creditors
  const debtors = members.filter(m => m.net < 0);
  const creditors = members.filter(m => m.net > 0);

  // Match debtors with creditors
  for (const debtor of debtors) {
    for (const creditor of creditors) {
      const amount = Math.min(
        Math.abs(debtor.net),
        Math.abs(creditor.net)
      );

      if (amount > 0) {
        settlements.push({
          from: debtor.name,
          to: creditor.name,
          amount,
          priority: amount // Sort by amount, highest first
        });
      }
    }
  }

  return settlements.sort((a, b) => b.priority - a.priority);
}

/**
 * Check if a balance sheet is fully settled
 */
export function isFullySettled(balances: Record<string, BalanceData>): boolean {
  return Object.values(balances).every(b => b.net === 0);
}

/**
 * Format balance message for UI display
 */
export function formatBalanceMessage(net: number, name: string): string {
  if (net > 0) {
    return `You are owed ₹${net.toLocaleString('en-IN')}`;
  } else if (net < 0) {
    return `You owe ₹${Math.abs(net).toLocaleString('en-IN')}`;
  }
  return 'All settled';
}
