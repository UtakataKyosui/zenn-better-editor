import { afterEach, expect, test } from '@rstest/core';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../src/App';

afterEach(() => {
  cleanup();
});

test('renders the live wysiwyg workspace', async () => {
  render(<App />);

  expect(
    await screen.findByRole('heading', { name: 'Rich Zenn Editor' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Live article canvas' })).toBeInTheDocument();
  expect(screen.getByLabelText('Current article markdown')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Open .md' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
});

test('renders zenn blocks as editable visual controls in the main canvas', async () => {
  render(<App />);

  expect(await screen.findByLabelText('Message body')).toHaveValue(
    'このブロックは Zenn の message 記法です。注意書きや補足に使います。',
  );
  expect(screen.getByLabelText('Details title')).toHaveValue(
    'ローカルプレビューで開いて確認',
  );
  expect(screen.getByLabelText('Card URL')).toHaveValue(
    'https://zenn.dev/zenn/articles/markdown-guide',
  );
  expect(screen.getByLabelText('Quote text')).toHaveValue(
    '引用ブロックも同時に確認できます。',
  );
});

test('applies source markdown back into the live canvas', async () => {
  render(<App />);

  const source = await screen.findByLabelText('Current article markdown');

  fireEvent.change(source, {
    target: {
      value: '# Applied title\n\n本文です。',
    },
  });

  expect(screen.getByText('Source differs from live canvas')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Apply to live canvas' }));

  await waitFor(() => {
    expect(screen.getByText('Source is in sync')).toBeInTheDocument();
  });

  expect(screen.getByText('Applied source to live canvas')).toBeInTheDocument();
  expect(screen.getByLabelText('Heading text')).toHaveValue('Applied title');
  expect(screen.getByLabelText('Paragraph text')).toHaveValue('本文です。');
});
