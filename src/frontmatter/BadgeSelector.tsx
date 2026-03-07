type BadgeOption<T extends string> = {
  value: T;
  label: string;
  icon?: string;
};

type BadgeSelectorProps<T extends string> = {
  options: BadgeOption<T>[];
  selected: T;
  onChange: (value: T) => void;
  label: string;
};

export const BadgeSelector = <T extends string>({
  options,
  selected,
  onChange,
  label,
}: BadgeSelectorProps<T>) => {
  return (
    <div className="badge-selector" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={selected === option.value}
          className={`badge-selector__badge ${selected === option.value ? 'badge-selector__badge--active' : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.icon && (
            <span className="badge-selector__icon">{option.icon}</span>
          )}
          {option.label}
        </button>
      ))}
    </div>
  );
};
