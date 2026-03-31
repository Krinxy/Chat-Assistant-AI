import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Sidebar } from './Sidebar';

describe('Sidebar Widget', () => {
  it('renders brand and navigation when open', () => {
    render(<Sidebar isSidebarOpen={true} setIsSidebarOpen={() => {}} hasStartedChat={false} activeView="dashboard" setActiveView={() => {}} />);
    expect(screen.getByText('Chat Assistant')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Letzte Chats')).toBeInTheDocument();
  });

  it('hides recent chats and services when chat has started, even if open', () => {
    render(<Sidebar isSidebarOpen={true} setIsSidebarOpen={() => {}} hasStartedChat={true} activeView="chat" setActiveView={() => {}} />);
    expect(screen.getByText('Chat Assistant')).toBeInTheDocument();
    expect(screen.queryByText('Letzte Chats')).not.toBeInTheDocument();
    expect(screen.queryByText('Services')).not.toBeInTheDocument();
  });
});
