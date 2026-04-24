import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Sidebar } from './Sidebar';
import { uiTextByLanguage } from '../../shared/i18n/uiText';

describe('Sidebar Widget', () => {
  it('renders brand and navigation when open', () => {
    render(
      <Sidebar
        isSidebarOpen={true}
        setIsSidebarOpen={() => {}}
        activeView="dashboard"
        setActiveView={() => {}}
        language="de"
        setLanguage={() => {}}
        theme="light"
        onToggleTheme={() => {}}
        copy={uiTextByLanguage.de.sidebar}
        activeServiceLabels={['Persona']}
        latestMessagePreview={null}
        onStartNewChat={() => {}}
        onOpenRecentChat={() => {}}
      />,
    );

    expect(screen.getByText('AURA')).toBeInTheDocument();
    expect(screen.getAllByText('Home').length).toBeGreaterThan(0);
    expect(screen.getByText('Letzte Chats')).toBeInTheDocument();
    expect(screen.getByText('Impressum')).toBeInTheDocument();
    expect(screen.getByText('DE')).toBeInTheDocument();
    expect(screen.getByText('EN')).toBeInTheDocument();
  });

  it('hides cards when sidebar is collapsed', () => {
    render(
      <Sidebar
        isSidebarOpen={false}
        setIsSidebarOpen={() => {}}
        activeView="chat"
        setActiveView={() => {}}
        language="de"
        setLanguage={() => {}}
        theme="dark"
        onToggleTheme={() => {}}
        copy={uiTextByLanguage.de.sidebar}
        activeServiceLabels={[]}
        latestMessagePreview={{ text: 'Testnachricht', time: '10:00' }}
        onStartNewChat={() => {}}
        onOpenRecentChat={() => {}}
      />,
    );

    expect(screen.queryByText('AURA')).not.toBeInTheDocument();
    expect(screen.queryByText('Letzte Chats')).not.toBeInTheDocument();
    expect(screen.getByText('DE')).toBeInTheDocument();
    expect(screen.getByText('EN')).toBeInTheDocument();
  });

  it('shows Aktiv only for current active recent chat', () => {
    render(
      <Sidebar
        isSidebarOpen={true}
        setIsSidebarOpen={() => {}}
        activeView="chat"
        setActiveView={() => {}}
        language="de"
        setLanguage={() => {}}
        theme="dark"
        onToggleTheme={() => {}}
        copy={uiTextByLanguage.de.sidebar}
        activeServiceLabels={[]}
        latestMessagePreview={{ text: 'Testnachricht', time: '10:00' }}
        onStartNewChat={() => {}}
        onOpenRecentChat={() => {}}
      />,
    );

    fireEvent.click(screen.getByText('Pipeline Fixes'));
    expect(screen.getByText('Aktiv')).toBeInTheDocument();
  });
});
