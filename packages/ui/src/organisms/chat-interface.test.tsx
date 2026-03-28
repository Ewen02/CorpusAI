import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInterface, type ChatMessage } from './chat-interface';

const makeMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: `msg-${Date.now()}`,
  role: 'user',
  content: 'Hello world',
  createdAt: new Date('2026-03-01T10:00:00Z'),
  ...overrides,
});

describe('ChatInterface', () => {
  it('should render welcome message when no messages', () => {
    render(
      <ChatInterface
        messages={[]}
        onSendMessage={vi.fn()}
        welcomeMessage="Bonjour, comment puis-je vous aider ?"
        aiName="MonAI"
      />
    );

    expect(screen.getByText('MonAI')).toBeInTheDocument();
    expect(screen.getByText('Bonjour, comment puis-je vous aider ?')).toBeInTheDocument();
  });

  it('should render user message content', () => {
    const msg = makeMessage({ role: 'user', content: 'What is RAG?' });
    render(<ChatInterface messages={[msg]} onSendMessage={vi.fn()} />);

    expect(screen.getByText('What is RAG?')).toBeInTheDocument();
  });

  it('should render assistant message content', () => {
    const msg = makeMessage({
      role: 'assistant',
      content: 'RAG stands for Retrieval Augmented Generation.',
    });
    render(<ChatInterface messages={[msg]} onSendMessage={vi.fn()} />);

    expect(screen.getByText(/RAG stands for/)).toBeInTheDocument();
  });

  it('should show typing indicator when isLoading and no streaming message', () => {
    render(<ChatInterface messages={[]} onSendMessage={vi.fn()} isLoading />);

    const dots = document.querySelectorAll('.typing-wave');
    expect(dots.length).toBe(3);
  });

  it('should not show typing indicator when a message is streaming', () => {
    const msg = makeMessage({ role: 'assistant', content: 'Streaming...', isStreaming: true });
    render(<ChatInterface messages={[msg]} onSendMessage={vi.fn()} isLoading />);

    const dots = document.querySelectorAll('.typing-wave');
    expect(dots.length).toBe(0);
  });

  it('should show streaming cursor for streaming message', () => {
    const msg = makeMessage({ role: 'assistant', content: 'In progress', isStreaming: true });
    render(<ChatInterface messages={[msg]} onSendMessage={vi.fn()} />);

    expect(screen.getByRole('status', { name: /réponse en cours/i })).toBeInTheDocument();
  });

  it('should call onSendMessage when form is submitted', () => {
    const onSend = vi.fn();
    render(<ChatInterface messages={[]} onSendMessage={onSend} />);

    const input = screen.getByPlaceholderText('Posez votre question...');
    fireEvent.change(input, { target: { value: 'My question' } });
    fireEvent.submit(input.closest('form')!);

    expect(onSend).toHaveBeenCalledWith('My question');
  });

  it('should disable input when isLoading', () => {
    render(<ChatInterface messages={[]} onSendMessage={vi.fn()} isLoading />);

    const input = screen.getByPlaceholderText('Posez votre question...');
    expect(input).toBeDisabled();
  });

  it('should display AI name initial in assistant avatar', () => {
    const msg = makeMessage({ role: 'assistant', content: 'Hello' });
    render(<ChatInterface messages={[msg]} onSendMessage={vi.fn()} aiName="TestBot" />);

    expect(screen.getByText('T')).toBeInTheDocument();
  });
});
