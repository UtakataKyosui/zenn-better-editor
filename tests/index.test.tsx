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

test('renders the markdown-first workspace', async () => {
  render(<App />);

  expect(
    await screen.findByRole('heading', { name: 'Rich Zenn Editor' }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('heading', { name: 'Unified markdown surface' }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText('YAML frontmatter')).toBeInTheDocument();
  expect(screen.getByLabelText('Markdown body')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Open .md' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  expect(screen.getByText('Markdown direct input')).toBeInTheDocument();
});

test('renders the zenn html preview inside the same surface', async () => {
  render(<App />);

  const panel = screen
    .getByRole('heading', { name: 'Unified markdown surface' })
    .closest('section');

  expect(panel).not.toBeNull();

  const preview = within(panel as HTMLElement);

  await waitFor(() => {
    expect(
      preview.getByText('ローカルプレビュー確認用のサンプル'),
    ).toBeInTheDocument();
  });
});

test('updates the rendered preview when markdown changes', async () => {
  render(<App />);

  const source = await screen.findByLabelText('Markdown body');

  fireEvent.change(source, {
    target: {
      value: '# Applied title\n\n本文です。',
    },
  });

  await waitFor(() => {
    expect(source).toHaveValue('# Applied title\n\n本文です。');
  });

  const panel = screen
    .getByRole('heading', { name: 'Unified markdown surface' })
    .closest('section');

  expect(panel).not.toBeNull();

  const preview = within(panel as HTMLElement);

  await waitFor(() => {
    expect(preview.getByText('Applied title')).toBeInTheDocument();
  });

  expect(preview.getByText('本文です。')).toBeInTheDocument();
});
