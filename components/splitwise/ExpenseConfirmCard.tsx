'use client';

interface ExpenseConfirmCardProps {
  expense: any;
  onConfirm: (expense: any) => void;
  onCancel: () => void;
}

export default function ExpenseConfirmCard({ expense, onConfirm, onCancel }: ExpenseConfirmCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      maximumFractionDigits: 0 
    }).format(amount);
  };

  return (
    <div className="w-full max-w-3xl mx-auto animate-in slide-in-from-bottom-4">
      <div className="bg-gradient-to-br from-[#FFF8F0] to-[#FFF3E0] border-2 border-[#D4956A] rounded-2xl p-6 shadow-lg">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">✦</span>
          <h3 className="font-['var(--font-playfair)'] font-semibold text-[#1A1208] text-xl">
            I found an expense
          </h3>
        </div>

        {/* Expense Details */}
        <div className="bg-white rounded-xl p-4 mb-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-['var(--font-playfair)'] font-semibold text-[#1A1208] text-lg mb-1">
                {expense.description}
              </h4>
              {expense.paidByName && !expense.isGroupFundExpense && (
                <p className="text-sm text-[#6B5744] font-['var(--font-dm-sans)']">
                  Paid by {expense.paidByName}
                </p>
              )}
              {expense.isGroupFundExpense && (
                <p className="text-sm text-[#8B4513] font-['var(--font-dm-sans)'] flex items-center gap-1.5">
                  <span>📦</span>
                  From Group Fund
                </p>
              )}
            </div>
            <p className="text-2xl font-['var(--font-playfair)'] font-bold text-[#8B4513]">
              {formatCurrency(expense.totalAmount)}
            </p>
          </div>

          {/* Splits */}
          {!expense.isGroupFundExpense && expense.splits && expense.splits.length > 0 && (
            <div className="border-t border-[#E8DDD0] pt-3 mt-3">
              <p className="text-sm font-['var(--font-dm-sans)'] font-semibold text-[#6B5744] mb-2">
                Split:
              </p>
              <div className="space-y-2">
                {expense.splits.map((split: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#8B4513] text-white flex items-center justify-center text-xs font-semibold">
                        {split.name[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-['var(--font-dm-sans)'] text-[#1A1208]">
                        {split.name}
                      </span>
                    </div>
                    <span className="text-sm font-['var(--font-dm-sans)'] font-semibold text-[#8B4513]">
                      {formatCurrency(split.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {expense.isGroupFundExpense && (
            <div className="border-t border-[#E8DDD0] pt-3 mt-3">
              <p className="text-sm font-['var(--font-dm-sans)'] text-[#6B5744]">
                This amount will be deducted from the group fund. No individual debts will be created.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => onConfirm(expense)}
            className="flex-1 bg-[#8B4513] text-white rounded-xl py-3 px-4 font-['var(--font-dm-sans)'] font-semibold hover:bg-[#6B3410] transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
          >
            <span>✓</span>
            Add to Group
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-white border-2 border-[#E8DDD0] text-[#6B5744] rounded-xl py-3 px-4 font-['var(--font-dm-sans)'] font-semibold hover:bg-[#F5EFE6] transition-all flex items-center justify-center gap-2"
          >
            <span>✗</span>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
