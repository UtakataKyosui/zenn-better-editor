import { type KeyboardEvent, useRef, useState } from 'react';

type TopicTagInputProps = {
  topics: string[];
  onChange: (topics: string[]) => void;
};

export const TopicTagInput = ({ topics, onChange }: TopicTagInputProps) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addTopic = (value: string) => {
    const trimmed = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '');
    if (trimmed && !topics.includes(trimmed) && topics.length < 5) {
      onChange([...topics, trimmed]);
    }
    setInputValue('');
  };

  const removeTopic = (index: number) => {
    onChange(topics.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTopic(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && topics.length > 0) {
      removeTopic(topics.length - 1);
    }
  };

  return (
    <fieldset
      className="topic-tag-input"
      onClick={() => inputRef.current?.focus()}
      onKeyDown={() => {}}
      aria-label="Topics"
    >
      {topics.map((topic, index) => (
        <span key={topic} className="topic-chip">
          {topic}
          <button
            type="button"
            className="topic-chip__remove"
            onClick={(e) => {
              e.stopPropagation();
              removeTopic(index);
            }}
            aria-label={`Remove ${topic}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        className="topic-tag-input__field"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (inputValue.trim()) addTopic(inputValue);
        }}
        placeholder={topics.length < 5 ? 'Add topic...' : ''}
        disabled={topics.length >= 5}
        aria-label="Add topic"
      />
      <span className="topic-tag-input__hint">{topics.length}/5 topics</span>
    </fieldset>
  );
};
