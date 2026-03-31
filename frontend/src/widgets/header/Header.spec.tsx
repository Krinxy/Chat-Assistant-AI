import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Header } from './Header';

describe('Header Widget', () => {
  it('renders correctly with greeting', () => {
    render(<Header greeting="Good afternoon" randomHeaderQuestion="How can I help you?" hasStartedChat={false} isSidebarOpen={true} setIsSidebarOpen={() => {}} />);
    expect(screen.getByText('Good afternoon, Dominic')).toBeInTheDocument();
    expect(screen.getByText('How can I help you?')).toBeInTheDocument();
  });

  it('hides the random question and profile name if chat has started', () => {
    render(<Header greeting="Good afternoon" randomHeaderQuestion="How can I help you?" hasStartedChat={true} isSidebarOpen={true} setIsSidebarOpen={() => {}} />);
    expect(screen.getByText('Good afternoon, Dominic')).toBeInTheDocument();
    expect(screen.getByText('DB')).toBeInTheDocument();
  });
});
