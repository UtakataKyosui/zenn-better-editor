import { afterEach, expect, test } from '@rstest/core';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import App from '../src/App';

afterEach(() => {
  cleanup();
});

test('renders the editor workspace', async () => {
  render(<App />);

  expect(
    await screen.findByRole('heading', { name: 'Rich Zenn Editor' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Current article markdown' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Open .md' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
});

test('renders zenn-specific blocks in the local preview', async () => {
  render(<App />);

  expect(await screen.findByRole('button', { name: 'Local preview' })).toBeInTheDocument();

  const previewPanel = screen
    .getByRole('heading', { name: 'zenn-cli bridge' })
    .closest('section');

  expect(previewPanel).not.toBeNull();

  const preview = within(previewPanel as HTMLElement);

  expect(preview.getByText('message')).toBeInTheDocument();
  expect(preview.getByText('ローカルプレビューで開いて確認')).toBeInTheDocument();
  expect(preview.getByText('link card')).toBeInTheDocument();
  expect(preview.getByText('引用ブロックも同時に確認できます。')).toBeInTheDocument();
});

test('marks source as dirty and applies markdown changes back to the editor', async () => {
  render(<App />);

  const source = await screen.findByLabelText('Current article markdown');

  fireEvent.change(source, {
    target: {
      value: '# Applied title\n\n本文です。',
    },
  });

  expect(screen.getByText('Source differs from editor')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Apply to editor' }));

  await waitFor(() => {
    expect(screen.getByText('Source is in sync')).toBeInTheDocument();
  });

  expect(screen.getByText('Applied source to editor')).toBeInTheDocument();
  expect(screen.getAllByText('Applied title')).toHaveLength(2);
  expect(screen.getAllByText('本文です。')).toHaveLength(2);
});
