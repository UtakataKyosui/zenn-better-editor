import { afterEach, expect, test } from '@rstest/core';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from '../src/App';

afterEach(() => {
  cleanup();
});

test('renders the markdown-first workspace', async () => {
  render(<App />);

  expect(
    await screen.findByRole('heading', { name: 'Rich Zenn Editor' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Markdown editor' })).toBeInTheDocument();
  expect(screen.getByLabelText('Markdown input')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Open .md' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  expect(screen.getByText('Markdown direct input')).toBeInTheDocument();
});

test('renders the zenn html preview beside the markdown editor', async () => {
  render(<App />);

  expect(await screen.findByText('Rendered with zenn-markdown-html')).toBeInTheDocument();

  const renderSection = screen
    .getByText('Rendered with zenn-markdown-html')
    .closest('section');

  expect(renderSection).not.toBeNull();

  const preview = within(renderSection as HTMLElement);

  await waitFor(() => {
    expect(preview.getByText('ローカルプレビュー確認用のサンプル')).toBeInTheDocument();
  });
});

test('updates the rendered preview when markdown changes', async () => {
  render(<App />);

  const source = await screen.findByLabelText('Markdown input');

  fireEvent.change(source, {
    target: {
      value: '# Applied title\n\n本文です。',
    },
  });

  await waitFor(() => {
    expect(source).toHaveValue('# Applied title\n\n本文です。');
  });

  const renderSection = screen
    .getByText('Rendered with zenn-markdown-html')
    .closest('section');

  expect(renderSection).not.toBeNull();

  const preview = within(renderSection as HTMLElement);

  await waitFor(() => {
    expect(preview.getByText('Applied title')).toBeInTheDocument();
  });

  expect(preview.getByText('本文です。')).toBeInTheDocument();
});
