import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConversationList, type Conversation } from './conversation-list';

const mockConversations: Conversation[] = [
  {
    id: 'conv-1',
    title: 'Question about RAG',
    lastMessage: 'How does vector search work?',
    messageCount: 4,
    createdAt: new Date('2026-03-01'),
    updatedAt: new Date('2026-03-04'),
  },
  {
    id: 'conv-2',
    title: null,
    lastMessage: null,
    messageCount: 0,
    createdAt: new Date('2026-03-02'),
    updatedAt: new Date('2026-03-02'),
  },
];

describe('ConversationList', () => {
  it('should render conversations', () => {
    const onSelect = vi.fn();
    render(<ConversationList conversations={mockConversations} onSelect={onSelect} />);

    expect(screen.getByText('Question about RAG')).toBeInTheDocument();
    expect(screen.getByText('Nouvelle conversation')).toBeInTheDocument();
  });

  it('should show empty state when no conversations', () => {
    const onSelect = vi.fn();
    render(<ConversationList conversations={[]} onSelect={onSelect} />);

    expect(screen.getByText('Aucune conversation')).toBeInTheDocument();
  });

  it('should show skeleton when loading', () => {
    const onSelect = vi.fn();
    const { container } = render(
      <ConversationList conversations={[]} onSelect={onSelect} isLoading />
    );

    // Skeleton renders animated shimmer divs
    const skeletons = container.querySelectorAll('.animate-shimmer');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should call onSelect when conversation is clicked', () => {
    const onSelect = vi.fn();
    render(<ConversationList conversations={mockConversations} onSelect={onSelect} />);

    fireEvent.click(screen.getByText('Question about RAG'));
    expect(onSelect).toHaveBeenCalledWith(mockConversations[0]);
  });

  it('should show "Nouvelle" button when onNewConversation is provided', () => {
    const onSelect = vi.fn();
    const onNew = vi.fn();
    render(
      <ConversationList
        conversations={mockConversations}
        onSelect={onSelect}
        onNewConversation={onNew}
      />
    );

    expect(screen.getByText('Nouvelle')).toBeInTheDocument();
  });

  it('should show message count for conversations', () => {
    const onSelect = vi.fn();
    render(<ConversationList conversations={mockConversations} onSelect={onSelect} />);

    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('should render header', () => {
    const onSelect = vi.fn();
    render(<ConversationList conversations={mockConversations} onSelect={onSelect} />);

    expect(screen.getByText('Conversations')).toBeInTheDocument();
  });

  it('should show "Démarrer" button in empty state when onNewConversation provided', () => {
    const onSelect = vi.fn();
    const onNew = vi.fn();
    render(<ConversationList conversations={[]} onSelect={onSelect} onNewConversation={onNew} />);

    expect(screen.getByText('Démarrer')).toBeInTheDocument();
  });
});
