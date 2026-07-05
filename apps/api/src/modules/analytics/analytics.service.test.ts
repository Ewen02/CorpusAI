import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import type {
  AnalyticsRepository,
  FlaggedMessageRow,
  QualityTotalsRow,
  UserQuestionRow,
} from './analytics.repository';
import type { OwnershipService } from '../../shared';

function makeRepo() {
  return {
    getTotals: vi.fn(),
    getDailyUsage: vi.fn(),
    getByModel: vi.fn(),
    getQualityTotals: vi.fn(),
    findFlaggedAssistantMessages: vi.fn(),
    findUserMessagesForConversations: vi.fn(),
  };
}

function makeOwnership() {
  return {
    verifyAIOwnership: vi.fn(),
  };
}

function totalsRow(overrides: Partial<QualityTotalsRow> = {}): QualityTotalsRow {
  return {
    assistantMessages: 0n,
    negativeFeedback: 0n,
    positiveFeedback: 0n,
    lowConfidence: 0n,
    ...overrides,
  };
}

function flaggedMessage(overrides: Partial<FlaggedMessageRow> = {}): FlaggedMessageRow {
  return {
    id: 'msg-1',
    conversationId: 'conv-1',
    createdAt: new Date('2026-07-01T10:00:00.000Z'),
    content: 'assistant answer',
    feedback: null,
    confidence: 'LOW',
    sources: null,
    ...overrides,
  };
}

function userMessage(overrides: Partial<UserQuestionRow> = {}): UserQuestionRow {
  return {
    conversationId: 'conv-1',
    createdAt: new Date('2026-07-01T09:59:00.000Z'),
    content: 'user question',
    ...overrides,
  };
}

describe('AnalyticsService — getQualityReport', () => {
  let repo: ReturnType<typeof makeRepo>;
  let ownership: ReturnType<typeof makeOwnership>;
  let service: AnalyticsService;

  beforeEach(() => {
    repo = makeRepo();
    ownership = makeOwnership();
    service = new AnalyticsService(
      repo as unknown as AnalyticsRepository,
      ownership as unknown as OwnershipService
    );

    ownership.verifyAIOwnership.mockResolvedValue(undefined);
    repo.getQualityTotals.mockResolvedValue(totalsRow());
    repo.findFlaggedAssistantMessages.mockResolvedValue([]);
    repo.findUserMessagesForConversations.mockResolvedValue([]);
  });

  describe('ownership', () => {
    it('throws NotFoundException and never queries when the AI is not owned', async () => {
      ownership.verifyAIOwnership.mockRejectedValue(new NotFoundException('AI not found'));

      await expect(
        service.getQualityReport('user-1', 'ai-other', { days: 30 })
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(ownership.verifyAIOwnership).toHaveBeenCalledWith('ai-other', 'user-1');
      expect(repo.getQualityTotals).not.toHaveBeenCalled();
      expect(repo.findFlaggedAssistantMessages).not.toHaveBeenCalled();
      expect(repo.findUserMessagesForConversations).not.toHaveBeenCalled();
    });
  });

  describe('totals and rates', () => {
    it('returns zero rates when there are no assistant messages (no NaN)', async () => {
      const report = await service.getQualityReport('user-1', 'ai-1', { days: 30 });

      expect(report.totals).toEqual({
        assistantMessages: 0,
        negativeFeedback: 0,
        positiveFeedback: 0,
        lowConfidence: 0,
        feedbackRate: 0,
        negativeRate: 0,
      });
      expect(report.failingAnswers).toEqual([]);
      expect(report.coverageGaps).toEqual([]);
    });

    it('returns negativeRate 0 when messages exist but no feedback was given', async () => {
      repo.getQualityTotals.mockResolvedValue(
        totalsRow({ assistantMessages: 8n, lowConfidence: 2n })
      );

      const report = await service.getQualityReport('user-1', 'ai-1', { days: 30 });

      expect(report.totals.feedbackRate).toBe(0);
      expect(report.totals.negativeRate).toBe(0);
      expect(report.totals.lowConfidence).toBe(2);
    });

    it('computes feedbackRate and negativeRate from the counters', async () => {
      repo.getQualityTotals.mockResolvedValue(
        totalsRow({
          assistantMessages: 10n,
          negativeFeedback: 2n,
          positiveFeedback: 3n,
          lowConfidence: 4n,
        })
      );

      const report = await service.getQualityReport('user-1', 'ai-1', { days: 30 });

      expect(report.totals.feedbackRate).toBe(0.5); // (3+2)/10
      expect(report.totals.negativeRate).toBe(0.4); // 2/(3+2)
    });

    it('echoes the requested window in period', async () => {
      const report = await service.getQualityReport('user-1', 'ai-1', { days: 7 });

      expect(report.period.days).toBe(7);
      const from = new Date(report.period.from).getTime();
      const to = new Date(report.period.to).getTime();
      expect(to - from).toBe(7 * 86_400_000);
    });
  });

  describe('question/answer pairing', () => {
    it('pairs each failing answer with the latest USER message strictly before it', async () => {
      repo.findFlaggedAssistantMessages.mockResolvedValue([
        flaggedMessage({
          id: 'msg-a',
          conversationId: 'conv-1',
          createdAt: new Date('2026-07-01T09:45:00.000Z'),
        }),
      ]);
      repo.findUserMessagesForConversations.mockResolvedValue([
        userMessage({
          conversationId: 'conv-1',
          createdAt: new Date('2026-07-01T09:00:00.000Z'),
          content: 'first question',
        }),
        userMessage({
          conversationId: 'conv-1',
          createdAt: new Date('2026-07-01T09:30:00.000Z'),
          content: 'second question',
        }),
        // After the assistant answer — must never be picked.
        userMessage({
          conversationId: 'conv-1',
          createdAt: new Date('2026-07-01T10:00:00.000Z'),
          content: 'later question',
        }),
      ]);

      const report = await service.getQualityReport('user-1', 'ai-1', { days: 30 });

      expect(report.failingAnswers).toHaveLength(1);
      expect(report.failingAnswers[0]?.question).toBe('second question');
    });

    it('never pairs questions across conversations and yields null when none exist', async () => {
      repo.findFlaggedAssistantMessages.mockResolvedValue([
        flaggedMessage({
          id: 'msg-b',
          conversationId: 'conv-2',
          createdAt: new Date('2026-07-01T09:45:00.000Z'),
        }),
      ]);
      repo.findUserMessagesForConversations.mockResolvedValue([
        userMessage({
          conversationId: 'conv-1',
          createdAt: new Date('2026-07-01T09:00:00.000Z'),
          content: 'question from another conversation',
        }),
      ]);

      const report = await service.getQualityReport('user-1', 'ai-1', { days: 30 });

      expect(report.failingAnswers[0]?.question).toBeNull();
    });

    it('fetches USER messages once for the deduplicated conversation ids', async () => {
      repo.findFlaggedAssistantMessages.mockResolvedValue([
        flaggedMessage({ id: 'msg-a', conversationId: 'conv-1' }),
        flaggedMessage({ id: 'msg-b', conversationId: 'conv-1' }),
        flaggedMessage({ id: 'msg-c', conversationId: 'conv-2' }),
      ]);

      await service.getQualityReport('user-1', 'ai-1', { days: 30 });

      expect(repo.findUserMessagesForConversations).toHaveBeenCalledTimes(1);
      expect(repo.findUserMessagesForConversations).toHaveBeenCalledWith(
        ['conv-1', 'conv-2'],
        expect.any(Date)
      );
    });
  });

  describe('failing answers mapping', () => {
    it('truncates the excerpt, maps feedback/confidence and counts sources', async () => {
      repo.findFlaggedAssistantMessages.mockResolvedValue([
        flaggedMessage({
          id: 'msg-long',
          content: 'x'.repeat(400),
          feedback: 'negative',
          confidence: 'HIGH',
          sources: [{ id: 'chunk-1' }, { id: 'chunk-2' }, { id: 'chunk-3' }],
        }),
        flaggedMessage({
          id: 'msg-positive-low',
          feedback: 'positive',
          confidence: 'LOW',
          sources: { not: 'an array' },
        }),
      ]);

      const report = await service.getQualityReport('user-1', 'ai-1', { days: 30 });

      const [first, second] = report.failingAnswers;
      expect(first?.answerExcerpt).toHaveLength(300);
      expect(first?.feedback).toBe('negative');
      expect(first?.confidence).toBe('HIGH');
      expect(first?.sourcesCount).toBe(3);

      // 'positive' feedback is not a failure signal — reported as null.
      expect(second?.feedback).toBeNull();
      expect(second?.confidence).toBe('LOW');
      expect(second?.sourcesCount).toBe(0);
    });

    it('caps failingAnswers at 20 keeping the most recent first', async () => {
      const flagged = Array.from({ length: 25 }, (_, i) =>
        flaggedMessage({
          id: `msg-${i}`,
          createdAt: new Date(Date.UTC(2026, 6, 1, 12, 0, 59 - i)),
        })
      );
      repo.findFlaggedAssistantMessages.mockResolvedValue(flagged);

      const report = await service.getQualityReport('user-1', 'ai-1', { days: 30 });

      expect(report.failingAnswers).toHaveLength(20);
      expect(report.failingAnswers[0]?.messageId).toBe('msg-0');
      expect(report.failingAnswers[19]?.messageId).toBe('msg-19');
    });
  });

  describe('coverage gaps', () => {
    it('groups low-confidence questions case- and whitespace-insensitively', async () => {
      const askedAt = (minute: number) => new Date(Date.UTC(2026, 6, 1, 10, minute));
      repo.findFlaggedAssistantMessages.mockResolvedValue([
        flaggedMessage({ id: 'm-1', conversationId: 'c-1', createdAt: askedAt(1) }),
        flaggedMessage({ id: 'm-2', conversationId: 'c-2', createdAt: askedAt(1) }),
        flaggedMessage({ id: 'm-3', conversationId: 'c-3', createdAt: askedAt(1) }),
      ]);
      repo.findUserMessagesForConversations.mockResolvedValue([
        userMessage({ conversationId: 'c-1', createdAt: askedAt(0), content: 'Pricing?' }),
        userMessage({ conversationId: 'c-2', createdAt: askedAt(0), content: '  pricing?  ' }),
        userMessage({ conversationId: 'c-3', createdAt: askedAt(0), content: 'PRICING?' }),
      ]);

      const report = await service.getQualityReport('user-1', 'ai-1', { days: 30 });

      expect(report.coverageGaps).toHaveLength(1);
      expect(report.coverageGaps[0]?.occurrences).toBe(3);
      expect(report.coverageGaps[0]?.question).toBe('Pricing?');
    });

    it('excludes non-LOW answers and unanswered questions from gaps', async () => {
      const askedAt = (minute: number) => new Date(Date.UTC(2026, 6, 1, 10, minute));
      repo.findFlaggedAssistantMessages.mockResolvedValue([
        // Negative feedback but HIGH confidence → failing answer, not a gap.
        flaggedMessage({
          id: 'm-neg',
          conversationId: 'c-1',
          createdAt: askedAt(1),
          feedback: 'negative',
          confidence: 'HIGH',
        }),
        // LOW confidence but no preceding user message → skipped from gaps.
        flaggedMessage({ id: 'm-low', conversationId: 'c-2', createdAt: askedAt(1) }),
      ]);
      repo.findUserMessagesForConversations.mockResolvedValue([
        userMessage({ conversationId: 'c-1', createdAt: askedAt(0), content: 'refund policy?' }),
      ]);

      const report = await service.getQualityReport('user-1', 'ai-1', { days: 30 });

      expect(report.failingAnswers).toHaveLength(2);
      expect(report.coverageGaps).toEqual([]);
    });

    it('ranks gaps by occurrences and caps the list at 10', async () => {
      const askedAt = (minute: number) => new Date(Date.UTC(2026, 6, 1, 10, minute));
      const flagged: FlaggedMessageRow[] = [];
      const questions: UserQuestionRow[] = [];

      // 12 distinct questions, "question-0" asked twice (conversations c-0 and c-dup).
      for (let i = 0; i < 12; i++) {
        flagged.push(
          flaggedMessage({ id: `m-${i}`, conversationId: `c-${i}`, createdAt: askedAt(1) })
        );
        questions.push(
          userMessage({ conversationId: `c-${i}`, createdAt: askedAt(0), content: `question-${i}` })
        );
      }
      flagged.push(flaggedMessage({ id: 'm-dup', conversationId: 'c-dup', createdAt: askedAt(1) }));
      questions.push(
        userMessage({ conversationId: 'c-dup', createdAt: askedAt(0), content: 'QUESTION-0' })
      );

      repo.findFlaggedAssistantMessages.mockResolvedValue(flagged);
      repo.findUserMessagesForConversations.mockResolvedValue(questions);

      const report = await service.getQualityReport('user-1', 'ai-1', { days: 30 });

      expect(report.coverageGaps).toHaveLength(10);
      expect(report.coverageGaps[0]?.question).toBe('question-0');
      expect(report.coverageGaps[0]?.occurrences).toBe(2);
    });
  });
});
