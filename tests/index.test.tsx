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
  expect(screen.getByRole('button', { name: 'Open .md' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  expect(screen.getByText('Markdown synced internally')).toBeInTheDocument();
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

test('updates the live canvas directly when a visual block is edited', async () => {
  render(<App />);

  const headings = await screen.findAllByLabelText('Heading text');
  const heading = headings[0];
  const paragraph = screen.getByLabelText('Paragraph text');

  fireEvent.change(heading, {
    target: { value: 'Applied title' },
  });
  fireEvent.change(paragraph, {
    target: { value: '本文です。' },
  });

  await waitFor(() => {
    expect(screen.getByDisplayValue('Applied title')).toBeInTheDocument();
  });

  expect(screen.getByDisplayValue('本文です。')).toBeInTheDocument();
  expect(screen.getByText('Live canvas updated')).toBeInTheDocument();
});
