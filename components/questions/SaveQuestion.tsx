'use client';

/**
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │                                                                             │
 * │  SAVE QUESTION COMPONENT                                                    │
 * │                                                                             │
 * │  Purpose:                                                                   │
 * │  This component provides a bookmarking interface for questions, allowing    │
 * │  users to save questions they want to reference later. It integrates with   │
 * │  the collection system and provides visual feedback through icon changes.   │
 * │                                                                             │
 * │  Key Features:                                                              │
 * │  1. User Interaction:                                                       │
 * │     - Clickable star icon for saving/unsaving                               │
 * │     - Visual feedback through icon state changes                            │
 * │     - Loading states during save operations                                 │
 * │                                                                             │
 * │  2. Authentication:                                                         │
 * │     - Checks user session status                                            │
 * │     - Handles unauthenticated user attempts                                 │
 * │     - Uses user ID for collection management                                │
 * │                                                                             │
 * │  3. State Management:                                                       │
 * │     - Uses server-side initial saved state                                  │
 * │     - Manages loading states during operations                              │
 * │     - Handles error states gracefully                                       │
 * │                                                                             │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { use, useState } from 'react';

import { toast } from '@/hooks/use-toast';
import { toggleSaveQuestion } from '@/lib/actions/collection.action';

interface SaveQuestionProps {
  questionId: string;
  initialSavedState: Promise<ActionResponse<{ saved: boolean }>>;
}

/**
 * SaveQuestion Component
 *
 * A button component that allows users to save/unsave questions.
 * It handles authentication, loading states, and displays appropriate toast messages.
 *
 * @param {SaveQuestionProps} props - Component props
 * @param {string} props.questionId - The ID of the question to save/unsave
 * @param {Promise<ActionResponse<{ saved: boolean }>>} props.initialSavedState - Initial saved state from server
 * @returns {JSX.Element} A clickable image button for saving/unsaving questions
 */
const SaveQuestion = ({ questionId, initialSavedState }: SaveQuestionProps) => {
  // Get user session and extract userId
  const { data: session } = useSession();
  const userId = session?.user?.id;

  // Get initial saved state from server
  const { data: savedState } = use(initialSavedState);
  const [isSaved, setIsSaved] = useState(savedState?.saved ?? false);

  // State for managing loading state during save/unsave operations
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Handles the save/unsave action for a question
   * - Checks if user is authenticated
   * - Toggles the save state
   * - Shows appropriate toast messages
   * - Handles loading states
   */
  const handleSave = async () => {
    // Prevent multiple clicks while loading
    if (isLoading) return;

    // Check if user is authenticated
    if (!userId) {
      toast({
        title: 'Authentication Required',
        description: 'You need to be logged in to save a question',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Call the server action to toggle save state
      const result = await toggleSaveQuestion({ questionId });

      // Handle error case
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to save question');
      }

      // Update local state
      setIsSaved(result.data?.saved ?? false);

      // Show success message
      toast({
        title: 'Success',
        description: `Question ${result.data?.saved ? 'saved' : 'unsaved'} successfully`,
      });
    } catch (error) {
      // Show error message
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      // Reset loading state
      setIsLoading(false);
    }
  };

  return (
    <Image
      src={isSaved ? '/icons/star-filled.svg' : '/icons/star-red.svg'}
      width={18}
      height={18}
      alt="save"
      className={`cursor-pointer ${isLoading ? 'opacity-50' : ''}`}
      aria-label={isSaved ? 'Unsave question' : 'Save question'}
      onClick={handleSave}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleSave();
        }
      }}
    />
  );
};

export default SaveQuestion;
