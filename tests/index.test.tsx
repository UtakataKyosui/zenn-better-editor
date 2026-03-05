import { afterEach, expect, test } from '@rstest/core';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
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
  expect(screen.getByRole('button', { name: /Split View|Seamless View/i })).toBeInTheDocument();
  // Frontmatter fields are now structured widgets, not a single textarea
  expect(screen.getByLabelText('Title')).toBeInTheDocument();
  expect(screen.getByLabelText('Emoji')).toBeInTheDocument();
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

  // Preview is always visible in both views
  await waitFor(() => {
    expect(screen.getByText('Rendered output')).toBeInTheDocument();

    expect(
      screen.getByText('ローカルプレビュー確認用のサンプル'),
    ).toBeInTheDocument();
  });
});

test('updates the save status when frontmatter changes', async () => {
  render(<App />);

  const titleInput = await screen.findByLabelText('Title');

  fireEvent.change(titleInput, {
    target: {
      value: 'New Title',
    },
  });

  await waitFor(() => {
    expect(screen.getByText('Live markdown editing')).toBeInTheDocument();
  });
});
