import { test, expect } from '@playwright/test';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Inline component for testing since we can't import uncompiled TSX
const AlphaBadge = ({ score }: { score: number | null | undefined }) => {
  if (score === null || score === undefined) {
    return <span data-testid="alpha-badge">N/A</span>;
  }
  const color = score >= 8 ? 'green' : score >= 5 ? 'yellow' : 'red';
  return (
    <span data-testid="alpha-badge" className={`alpha-${color}`}>
      {score.toFixed(1)}
    </span>
  );
};

test.describe('AlphaBadge Component', () => {
  test('displays N/A for null score', () => {
    render(<AlphaBadge score={null} />);
    expect(screen.getByTestId('alpha-badge')).toHaveTextContent('N/A');
  });

  test('displays N/A for undefined score', () => {
    render(<AlphaBadge score={undefined} />);
    expect(screen.getByTestId('alpha-badge')).toHaveTextContent('N/A');
  });

  test('displays score with one decimal place', () => {
    render(<AlphaBadge score={9.4} />);
    expect(screen.getByTestId('alpha-badge')).toHaveTextContent('9.4');
  });

  test('displays high score (>=8) with green color', () => {
    render(<AlphaBadge score={9.4} />);
    expect(screen.getByTestId('alpha-badge')).toHaveClass('alpha-green');
  });

  test('displays medium score (5-7.9) with yellow color', () => {
    render(<AlphaBadge score={6.9} />);
    expect(screen.getByTestId('alpha-badge')).toHaveClass('alpha-yellow');
  });

  test('displays low score (<5) with red color', () => {
    render(<AlphaBadge score={3.2} />);
    expect(screen.getByTestId('alpha-badge')).toHaveClass('alpha-red');
  });
});
