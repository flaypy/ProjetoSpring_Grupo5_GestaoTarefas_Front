export interface PriorityOption {
  value: number;
  viewValue: string;
  icon?: string; // Optional: for display in select/table
  colorClass?: string; // Optional: for styling
}

export const PRIORITIES: PriorityOption[] = [
  { value: 0, viewValue: 'Baixa', icon: 'low_priority', colorClass: 'text-green-600' },
  { value: 1, viewValue: 'Media', icon: 'remove', colorClass: 'text-yellow-600' },
  { value: 2, viewValue: 'Alta', icon: 'priority_high', colorClass: 'text-red-600' }
];

export function getPriorityByValue(value: number): PriorityOption | undefined {
  return PRIORITIES.find(p => p.value === value);
}
