'use server';

import mongoose, { ClientSession } from 'mongoose';
import { revalidatePath } from 'next/cache';

import ROUTES from '@/constants/routes';
import { Answer, Question, Vote } from '@/database';

import action from '../handlers/action';
import handleError from '../handlers/error';
import { CreateVoteSchema, HasVotedSchema, UpdateVoteCountSchema } from '../validations';

// Types
type VoteType = 'upvote' | 'downvote';
type TargetType = 'question' | 'answer';

interface CreateVoteParams {
  targetId: string;
  targetType: TargetType;
  voteType: VoteType;
}

interface UpdateVoteCountParams {
  targetId: string;
  targetType: TargetType;
  voteType: VoteType;
  change: number;
}

interface HasVotedParams {
  targetId: string;
  targetType: TargetType;
}

interface HasVotedResponse {
  hasUpvoted: boolean;
  hasDownvoted: boolean;
}

interface ActionResponse<T = void> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
  };
}

type ErrorResponse = ActionResponse & {
  success: false;
  error: {
    message: string;
  };
};

/**
 * Updates the vote count for a question or answer
 * @param params - Parameters for updating vote count
 * @param session - Optional MongoDB session for transaction support
 * @returns ActionResponse indicating success or failure
 */
export async function updateVoteCount(params: UpdateVoteCountParams, session?: ClientSession): Promise<ActionResponse> {
  const validationResult = await action({
    params,
    schema: UpdateVoteCountSchema,
  });

  if (validationResult instanceof Error) {
    return handleError(validationResult) as ErrorResponse;
  }

  const { targetId, targetType, voteType, change } = validationResult.params!;
  const Model = targetType === 'question' ? Question : Answer;
  const voteField = voteType === 'upvote' ? 'upvotes' : 'downvotes';

  try {
    const result = await Model.findByIdAndUpdate(targetId, { $inc: { [voteField]: change } }, { new: true, session });

    if (!result) {
      return handleError(new Error('Failed to update vote count')) as ErrorResponse;
    }

    return { success: true };
  } catch (error) {
    return handleError(error) as ErrorResponse;
  }
}

/**
 * Removes an existing vote and updates the vote count
 * @param voteId - ID of the vote to remove
 * @param params - Parameters for updating vote count
 * @param session - MongoDB session for transaction support
 */
async function removeVote(voteId: string, params: UpdateVoteCountParams, session: ClientSession): Promise<void> {
  await Vote.deleteOne({ _id: voteId }).session(session);
  await updateVoteCount(params, session);
}

/**
 * Updates an existing vote to a new type and adjusts vote counts accordingly
 * @param voteId - ID of the vote to update
 * @param newVoteType - New vote type to set
 * @param params - Parameters for the vote operation
 * @param session - MongoDB session for transaction support
 */
async function switchVoteType(
  voteId: string,
  newVoteType: VoteType,
  params: CreateVoteParams,
  session: ClientSession
): Promise<void> {
  const { targetId, targetType } = params;

  // Update the vote type
  await Vote.findByIdAndUpdate(voteId, { voteType: newVoteType }, { new: true, session });

  // Remove the previous vote count
  await updateVoteCount(
    {
      targetId,
      targetType,
      voteType: newVoteType === 'upvote' ? 'downvote' : 'upvote',
      change: -1,
    },
    session
  );

  // Add the new vote count
  await updateVoteCount(
    {
      targetId,
      targetType,
      voteType: newVoteType,
      change: 1,
    },
    session
  );
}

/**
 * Creates a new vote and updates the vote count
 * @param params - Parameters for creating a vote
 * @param userId - ID of the user creating the vote
 * @param session - MongoDB session for transaction support
 */
async function createNewVote(params: CreateVoteParams, userId: string, session: ClientSession): Promise<void> {
  const { targetId, targetType, voteType } = params;

  await Vote.create(
    [
      {
        author: userId,
        actionId: targetId,
        actionType: targetType,
        voteType,
      },
    ],
    { session }
  );

  await updateVoteCount(
    {
      targetId,
      targetType,
      voteType,
      change: 1,
    },
    session
  );
}

/**
 * Handles the creation, updating, or removal of a vote
 * @param params - Parameters for the vote operation
 * @returns ActionResponse indicating success or failure
 */
export async function createVote(params: CreateVoteParams): Promise<ActionResponse> {
  const validationResult = await action({
    params,
    schema: CreateVoteSchema,
    authorize: true,
  });

  if (validationResult instanceof Error) {
    return handleError(validationResult) as ErrorResponse;
  }

  const { targetId, targetType, voteType } = validationResult.params!;
  const userId = validationResult.session?.user?.id;

  if (!userId) return handleError(new Error('Unauthorized')) as ErrorResponse;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const existingVote = await Vote.findOne({
      author: userId,
      actionId: targetId,
      actionType: targetType,
    }).session(session);

    if (existingVote) {
      if (existingVote.voteType === voteType) {
        // Remove vote if clicking the same type again
        await removeVote(existingVote._id, { targetId, targetType, voteType, change: -1 }, session);
      } else {
        // Switch vote type (e.g., from upvote to downvote)
        await switchVoteType(existingVote._id, voteType, params, session);
      }
    } else {
      // Create new vote
      await createNewVote(params, userId, session);
    }

    await session.commitTransaction();
    session.endSession();

    revalidatePath(ROUTES.QUESTION(targetId));

    return { success: true };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return handleError(error) as ErrorResponse;
  }
}

/**
 * Checks if a user has voted on a specific question or answer
 * @param params - Parameters for checking vote status
 * @returns ActionResponse containing vote status information
 */
export async function hasVoted(params: HasVotedParams): Promise<ActionResponse<HasVotedResponse>> {
  const validationResult = await action({
    params,
    schema: HasVotedSchema,
    authorize: true,
  });

  if (validationResult instanceof Error) {
    return {
      success: false,
      error: { message: validationResult.message },
      data: { hasUpvoted: false, hasDownvoted: false },
    };
  }

  const { targetId, targetType } = validationResult.params!;
  const userId = validationResult.session?.user?.id;

  try {
    const vote = await Vote.findOne({
      author: userId,
      actionId: targetId,
      actionType: targetType,
    });

    if (!vote) {
      return {
        success: true,
        data: { hasUpvoted: false, hasDownvoted: false },
      };
    }

    return {
      success: true,
      data: {
        hasUpvoted: vote.voteType === 'upvote',
        hasDownvoted: vote.voteType === 'downvote',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: { message: error instanceof Error ? error.message : 'An error occurred' },
      data: { hasUpvoted: false, hasDownvoted: false },
    };
  }
}
