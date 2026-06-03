'use client';

interface GroupListProps {
  groups: any[];
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
}

export default function GroupList({ groups, selectedGroupId, onSelectGroup }: GroupListProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      maximumFractionDigits: 0 
    }).format(amount);
  };

  return (
    <div className="p-2 space-y-2">
      {groups.map((group) => (
        <button
          key={group.id}
          onClick={() => onSelectGroup(group.id)}
          className={`w-full p-4 rounded-xl text-left transition-all font-['var(--font-dm-sans)'] ${
            selectedGroupId === group.id
              ? 'bg-white shadow-sm border border-[#E8DDD0]'
              : 'bg-white/50 hover:bg-white border border-transparent'
          }`}
        >
          <h3 className="font-semibold text-[#1A1208] mb-1 truncate">
            {group.name}
          </h3>
          {group.description && (
            <p className="text-sm text-[#6B5744] mb-2 truncate">
              {group.description}
            </p>
          )}
          {group.group_fund > 0 && (
            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-[#FFF3CD] rounded-full text-xs font-medium text-[#8B4513]">
              <span>📦</span>
              <span>Fund: {formatCurrency(group.group_fund)}</span>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
