'use client';

import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { use, useState } from 'react';

import { toast } from '@/hooks/use-toast';
import { createVote } from '@/lib/actions/vote.action';
import { formatNumber } from '@/lib/utils';

// Types
type VoteType = 'upvote' | 'downvote';
type TargetType = 'question' | 'answer';

interface VoteButtonProps {
  type: VoteType;
  count: number;
  isVoted: boolean;
  isLoading: boolean;
  onClick: () => Promise<void>;
}

interface VotesProps {
  targetType: TargetType;
  targetId: string;
  upvotes: number;
  downvotes: number;
  hasVotedPromise: Promise<ActionResponse<HasVotedResponse>>;
}

// Vote Button Component
const VoteButton = ({ type, count, isVoted, isLoading, onClick }: VoteButtonProps) => {
  const iconPath =
    type === 'upvote'
      ? isVoted
        ? '/icons/upvoted.svg'
        : '/icons/upvote.svg'
      : isVoted
        ? '/icons/downvoted.svg'
        : '/icons/downvote.svg';

  return (
    <div className="flex-center gap-1.5">
      <Image
        src={iconPath}
        width={18}
        height={18}
        alt={type}
        className={`cursor-pointer ${isLoading && 'opacity-50'}`}
        aria-label={type === 'upvote' ? 'Upvote' : 'Downvote'}
        onClick={() => !isLoading && onClick()}
      />

      <div className="flex-center background-light700_dark400 min-w-5 rounded-sm p-1">
        <p className="subtle-medium text-dark400_light900">{formatNumber(count)}</p>
      </div>
    </div>
  );
};

const Votes = ({ upvotes, downvotes, hasVotedPromise, targetId, targetType }: VotesProps) => {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [isLoading, setIsLoading] = useState(false);

  // Get vote status from promise and handle unauthorized case
  const voteStatus = use(hasVotedPromise);
  const { hasUpvoted = false, hasDownvoted = false } = voteStatus.success ? voteStatus.data || {} : {};

  const handleVote = async (voteType: VoteType): Promise<void> => {
    if (!userId) {
      toast({
        title: 'Please login to vote',
        description: 'Only logged-in users can vote.',
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await createVote({
        targetId,
        targetType,
        voteType,
      });

      if (!result.success) {
        toast({
          title: 'Failed to vote',
          description: result.error?.message || 'An error occurred while voting.',
          variant: 'destructive',
        });
        return;
      }

      const successMessage =
        voteType === 'upvote'
          ? `Upvote ${!hasUpvoted ? 'added' : 'removed'} successfully`
          : `Downvote ${!hasDownvoted ? 'added' : 'removed'} successfully`;

      toast({
        title: successMessage,
        description: 'Your vote has been recorded.',
      });
    } catch (error) {
      toast({
        title: 'Failed to vote',
        description: 'An error occurred while voting. Please try again later.',
        variant: 'destructive',
      });

      console.error('Vote error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-center gap-2.5">
      <VoteButton
        type="upvote"
        count={upvotes}
        isVoted={voteStatus.success && hasUpvoted}
        isLoading={isLoading}
        onClick={() => handleVote('upvote')}
      />

      <VoteButton
        type="downvote"
        count={downvotes}
        isVoted={voteStatus.success && hasDownvoted}
        isLoading={isLoading}
        onClick={() => handleVote('downvote')}
      />
    </div>
  );
};

export default Votes;
