import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import { ImprintPanel } from './ImprintPanel';

describe('ImprintPanel', () => {
  it('renders the study project notice heading in German', () => {
    render(<ImprintPanel language="de" onClose={() => {}} />);
    expect(
      screen.getByRole('heading', { name: /Hochschulprojekt ohne kommerzielle Absicht/ }),
    ).toBeInTheDocument();
  });

  it('renders the study project notice heading in English', () => {
    render(<ImprintPanel language="en" onClose={() => {}} />);
    expect(
      screen.getByRole('heading', { name: /university project/i }),
    ).toBeInTheDocument();
  });

  it('renders the no-obligation heading', () => {
    render(<ImprintPanel language="de" onClose={() => {}} />);
    expect(screen.getByRole('heading', { name: /Impressumspflicht/ })).toBeInTheDocument();
  });

  it('renders non-commercial section heading', () => {
    render(<ImprintPanel language="de" onClose={() => {}} />);
    expect(
      screen.getByRole('heading', { name: /Kein kommerzieller Betrieb/ }),
    ).toBeInTheDocument();
  });

  it('renders responsible person name', () => {
    render(<ImprintPanel language="en" onClose={() => {}} />);
    expect(screen.getByText('Dominic Bechtold')).toBeInTheDocument();
  });

  it('renders non-commercial section heading in English', () => {
    render(<ImprintPanel language="en" onClose={() => {}} />);
    expect(
      screen.getByRole('heading', { name: /Non-commercial operation/ }),
    ).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<ImprintPanel language="en" onClose={onClose} />);
    screen.getByRole('button', { name: /Close/i }).click();
    expect(onClose).toHaveBeenCalled();
  });
});
