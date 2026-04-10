import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Header } from './Header';

describe('Header Widget', () => {
  it('renders correctly with greeting', () => {
    render(
      <Header
        greeting="Good afternoon"
        randomHeaderQuestion="How can I help you?"
        hasStartedChat={false}
        showChatBrand={false}
        profileRole="Software Architect"
      />,
    );

    expect(screen.getByText('Good afternoon, Dominic')).toBeInTheDocument();
    expect(screen.getByText('How can I help you?')).toBeInTheDocument();
    expect(screen.getByText('Software Architect')).toBeInTheDocument();
  });

  it('shows compact header in chat mode', () => {
    render(
      <Header
        greeting="Good afternoon"
        randomHeaderQuestion="How can I help you?"
        hasStartedChat={true}
        showChatBrand={true}
        profileRole="Software Architect"
      />,
    );

    expect(screen.getByText('AURA')).toBeInTheDocument();
    expect(screen.getByText('DB')).toBeInTheDocument();
    expect(screen.queryByText('How can I help you?')).not.toBeInTheDocument();
    expect(screen.queryByText('Dominic Bechtold')).not.toBeInTheDocument();
  });

  it('hides brand in compact mode when showChatBrand is false', () => {
    render(
      <Header
        greeting="Good afternoon"
        randomHeaderQuestion="How can I help you?"
        hasStartedChat={true}
        showChatBrand={false}
        profileRole="Software Architect"
      />,
    );

    expect(screen.queryByText('AURA')).not.toBeInTheDocument();
    expect(screen.getByText('DB')).toBeInTheDocument();
  });
});
