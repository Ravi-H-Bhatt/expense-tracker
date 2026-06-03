/**
 * AI Natural Language Parsing for Expenses
 * Handles complex multi-part expense inputs and various payment patterns
 */

export interface ExpenseDebt {
  member: string;
  owes: number;
}

export interface ParsedExpense {
  type: 'split' | 'group_fund' | 'personal';
  amount: number;
  description: string;
  paidBy: string; // user_id or name
  paidFromFund: boolean;
  splitAmong: string[]; // list of user_ids or names
  debts: ExpenseDebt[];
}

export interface ParsingResult {
  expenses: ParsedExpense[];
  message: string; // human-readable confirmation shown in chat
  hasAmbiguity?: boolean;
  clarificationNeeded?: string;
}

/**
 * Parse natural language expense input
 * PARSING RULES:
 * 1. MULTI-EXPENSE: A single message may contain multiple separate expenses
 * 2. GROUP FUND: "from group fund", "paid from group fund", "group fund used", "group fund expense"
 * 3. SPLIT EXPENSES: "I paid X split among all", "divide among all", "split with [name]"
 * 4. PAYER DETECTION: "I paid", "I spent", "I bought" = current user
 * 5. SETTLEMENT: "settle up", "mark as paid", "clear balance" = settlement, NOT expense
 */
export function parseExpenseInput(
  input: string,
  currentUserId: string,
  currentUserName: string,
  groupMembers: { name: string; id: string }[]
): ParsingResult {
  const trimmedInput = input.trim().toLowerCase();
  const normalizedInput = input.trim();

  // Check for settlement commands first
  if (
    trimmedInput.includes('settle up') ||
    trimmedInput.includes('mark as paid') ||
    trimmedInput.includes('clear balance')
  ) {
    return {
      expenses: [],
      message: 'Settlement command detected. This will be handled separately.',
      hasAmbiguity: true,
      clarificationNeeded:
        'Did you mean to settle up with someone? Please specify "settle with [name]"'
    };
  }

  const expenses: ParsedExpense[] = [];
  let workingText = normalizedInput;

  // Try to split into multiple expenses if there are conjunction keywords
  const multiExpenseSplits = workingText.match(
    /and (?:another|also)\s+(?:\d+[\d,]*(?:\.\d{2})?|\w+\s+(?:rupees|rs|₹)?)/gi
  );

  if (multiExpenseSplits && multiExpenseSplits.length > 0) {
    // Handle multiple expenses in one message
    const parts = workingText.split(/\s+and\s+(?:another|also)\s+/i);
    parts.forEach((part, index) => {
      const expense = parseSingleExpense(part.trim(), currentUserId, currentUserName, groupMembers);
      if (expense) {
        expenses.push(expense);
      }
    });
  } else {
    // Single expense
    const expense = parseSingleExpense(workingText, currentUserId, currentUserName, groupMembers);
    if (expense) {
      expenses.push(expense);
    }
  }

  if (expenses.length === 0) {
    return {
      expenses: [],
      message: 'Could not parse expense. Please try: "I paid ₹500 for dinner" or "Split ₹300 for groceries"',
      hasAmbiguity: true,
      clarificationNeeded: 'How much did you spend and what for?'
    };
  }

  // Generate confirmation message
  let confirmationMsg = '';
  if (expenses.length === 1) {
    const exp = expenses[0];
    if (exp.type === 'group_fund') {
      confirmationMsg = `Expense of ₹${exp.amount.toLocaleString('en-IN')} will be paid from group fund: ${exp.description}`;
    } else if (exp.type === 'split') {
      const numMembers = exp.splitAmong.length;
      confirmationMsg = `Split ₹${exp.amount.toLocaleString('en-IN')} equally among ${numMembers} members (₹${Math.round(exp.amount / numMembers).toLocaleString('en-IN')} each): ${exp.description}`;
    } else {
      confirmationMsg = `Personal expense of ₹${exp.amount.toLocaleString('en-IN')}: ${exp.description}`;
    }
  } else {
    confirmationMsg = `${expenses.length} expenses parsed:\n`;
    expenses.forEach((exp, i) => {
      confirmationMsg += `  ${i + 1}. ₹${exp.amount.toLocaleString('en-IN')} - ${exp.description}\n`;
    });
  }

  return {
    expenses,
    message: confirmationMsg
  };
}

/**
 * Parse a single expense statement
 */
function parseSingleExpense(
  text: string,
  currentUserId: string,
  currentUserName: string,
  groupMembers: { name: string; id: string }[]
): ParsedExpense | null {
  const lowerText = text.toLowerCase();

  // Extract amount
  const amountMatch = text.match(/(?:₹|rs)\s*([0-9,]+(?:\.\d{2})?)/i) ||
    text.match(/([0-9,]+(?:\.\d{2})?)\s*(?:rupees|rs|₹)?/i) ||
    text.match(/spent\s+([0-9,]+)/i);

  if (!amountMatch) return null;

  const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  if (isNaN(amount) || amount <= 0) return null;

  // Check if group fund expense
  if (
    lowerText.includes('from group fund') ||
    lowerText.includes('paid from group fund') ||
    lowerText.includes('group fund used') ||
    lowerText.includes('group fund expense')
  ) {
    // Extract description
    const descMatch = text.match(/for\s+(.+?)(?:from group fund|$)/i);
    const description = descMatch ? descMatch[1].trim() : 'Group fund expense';

    return {
      type: 'group_fund',
      amount,
      description,
      paidBy: currentUserId,
      paidFromFund: true,
      splitAmong: [],
      debts: []
    };
  }

  // Determine payer
  let paidBy = currentUserId;
  let paidByName = currentUserName;

  // Check for "X paid" pattern (other user is payer)
  const otherPayerMatch = text.match(/(\w+)\s+(?:paid|spent|bought)/i);
  if (
    otherPayerMatch &&
    otherPayerMatch[1].toLowerCase() !== 'i' &&
    otherPayerMatch[1].toLowerCase() !== 'me'
  ) {
    const memberName = otherPayerMatch[1];
    const foundMember = groupMembers.find(m => m.name.toLowerCase() === memberName.toLowerCase());
    if (foundMember) {
      paidBy = foundMember.id;
      paidByName = foundMember.name;
    }
  }

  // Check if split expense
  const isSplit =
    lowerText.includes('split') ||
    lowerText.includes('divide') ||
    lowerText.includes('split among') ||
    lowerText.includes('split with');

  if (isSplit) {
    // Extract who to split with
    let splitMembers: string[] = [];
    let splitMemberIds: string[] = [];

    if (lowerText.includes('all') || lowerText.includes('everyone') || lowerText.includes('all members')) {
      // Split with all members
      splitMembers = groupMembers.map(m => m.name);
      splitMemberIds = groupMembers.map(m => m.id);
    } else {
      // Extract specific member names
      const splitWithMatch = text.match(/split\s+(?:with|among|between)\s+(.+?)(?:\s+(?:for|at|of|and|$))/i);
      if (splitWithMatch) {
        const namesStr = splitWithMatch[1];
        const namesArray = namesStr
          .split(/\s+(?:and|,)\s+/)
          .map(n => n.trim())
          .filter(n => n);

        namesArray.forEach(name => {
          const foundMember = groupMembers.find(m => m.name.toLowerCase() === name.toLowerCase());
          if (foundMember) {
            splitMembers.push(foundMember.name);
            splitMemberIds.push(foundMember.id);
          }
        });
      }
    }

    // If no members found, default to all
    if (splitMembers.length === 0) {
      splitMembers = groupMembers.map(m => m.name);
      splitMemberIds = groupMembers.map(m => m.id);
    }

    // Create debts
    const amountPerPerson = amount / splitMemberIds.length;
    const debts: ExpenseDebt[] = splitMemberIds
      .filter(id => id !== paidBy) // Payer doesn't owe themselves
      .map((id, idx) => ({
        member: splitMembers[idx],
        owes: amountPerPerson
      }));

    // Extract description
    const descMatch = text.match(/(?:for|at)\s+(.+?)(?:\s+split|$)/i) ||
      text.match(/(?:split.*?)\s+for\s+(.+?)$/i);
    const description = descMatch ? descMatch[1].trim() : 'Shared expense';

    return {
      type: 'split',
      amount,
      description,
      paidBy,
      paidFromFund: false,
      splitAmong: splitMemberIds,
      debts
    };
  }

  // Personal expense (no split)
  const descMatch = text.match(/(?:for|bought|spent|paid)?\s+(?:for\s+)?(.+?)$/i);
  const description = descMatch ? descMatch[1].trim() : 'Expense';

  return {
    type: 'personal',
    amount,
    description,
    paidBy,
    paidFromFund: false,
    splitAmong: [],
    debts: []
  };
}

/**
 * Get balance sheet action button logic
 */
export function getActionButton(
  member: {
    name: string;
    paid: number;
    owes: number;
    net: number;
    userId: string;
  },
  currentUserId: string
): {
  label: string;
  type: 'request' | 'pay';
  disabled: boolean;
} | null {
  const net = member.net;

  if (member.userId === currentUserId) {
    // Current user's own row
    if (net > 0) {
      // I am owed money — show Request button
      return { label: 'Request', type: 'request', disabled: false };
    }
    // If I owe, no action on own row
    return null;
  }

  // Other member's row
  if (net < 0) {
    // This person owes money — show Pay button for them
    return { label: 'Pay', type: 'pay', disabled: false };
  } else if (net > 0) {
    // This person is owed — show Request button so I can ask them
    return { label: 'Request', type: 'request', disabled: false };
  }

  return null;
}
