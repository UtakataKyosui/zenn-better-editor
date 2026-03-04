import { expect, test } from '@rstest/core';
import { render, screen } from '@testing-library/react';
import App from '../src/App';

test('renders the editor workspace', async () => {
  render(<App />);

  expect(
    await screen.findByRole('heading', { name: 'Rich Zenn Editor' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Current article markdown' })).toBeInTheDocument();
});
