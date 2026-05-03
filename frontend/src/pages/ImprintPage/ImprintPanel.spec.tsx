import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import { ImprintPanel } from './ImprintPanel';

describe('ImprintPanel', () => {
  it('renders the study project notice in German', () => {
    render(<ImprintPanel language="de" onClose={() => {}} />);
    expect(screen.getByText('Hinweis: Studienprojekt')).toBeInTheDocument();
    expect(screen.getByText(/Studienprojekt/)).toBeInTheDocument();
  });

  it('renders the study project notice in English', () => {
    render(<ImprintPanel language="en" onClose={() => {}} />);
    expect(screen.getByText('Notice: Study Project')).toBeInTheDocument();
    expect(screen.getByText(/study project/i)).toBeInTheDocument();
  });

  it('renders provider company name', () => {
    render(<ImprintPanel language="en" onClose={() => {}} />);
    expect(screen.getByText('AURA Labs GmbH')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<ImprintPanel language="en" onClose={onClose} />);
    screen.getByText('Close').click();
    expect(onClose).toHaveBeenCalled();
  });
});
