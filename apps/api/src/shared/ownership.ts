/**
 * Ownership verification utilities for authorization checks.
 * Centralizes the common pattern of verifying resource ownership.
 */

import { NotFoundException } from "@nestjs/common";
import { prisma } from "@corpusai/database";

/**
 * Verifies that the user owns the AI resource.
 * @throws NotFoundException if AI not found or not owned by user
 */
export async function verifyAIOwnership(aiId: string, userId: string): Promise<void> {
  const ai = await prisma.aI.findFirst({
    where: { id: aiId, userId },
    select: { id: true },
  });

  if (!ai) {
    throw new NotFoundException("AI not found");
  }
}

/**
 * Verifies that the user owns the AI and returns basic AI info.
 * @throws NotFoundException if AI not found or not owned by user
 */
export async function getOwnedAI(aiId: string, userId: string) {
  const ai = await prisma.aI.findFirst({
    where: { id: aiId, userId },
  });

  if (!ai) {
    throw new NotFoundException("AI not found");
  }

  return ai;
}

/**
 * Verifies that the user owns the document (via AI ownership).
 * @throws NotFoundException if document not found or not owned by user
 */
export async function verifyDocumentOwnership(
  documentId: string,
  userId: string
): Promise<{ documentId: string; aiId: string }> {
  const document = await prisma.document.findFirst({
    where: { id: documentId },
    include: {
      ai: {
        select: { id: true, userId: true },
      },
    },
  });

  if (!document || document.ai.userId !== userId) {
    throw new NotFoundException("Document not found");
  }

  return { documentId: document.id, aiId: document.ai.id };
}

/**
 * Verifies that the user owns the conversation (via AI ownership).
 * @throws NotFoundException if conversation not found or not owned by user
 */
export async function verifyConversationOwnership(
  conversationId: string,
  userId: string
): Promise<{ conversationId: string; aiId: string }> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      ai: {
        select: { id: true, userId: true },
      },
    },
  });

  if (!conversation || conversation.ai.userId !== userId) {
    throw new NotFoundException("Conversation not found");
  }

  return { conversationId: conversation.id, aiId: conversation.ai.id };
}
