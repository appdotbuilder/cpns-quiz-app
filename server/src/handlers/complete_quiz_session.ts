import { db } from '../db';
import { quizSessionsTable, userAnswersTable, questionsTable, quizPackagesTable } from '../db/schema';
import { type CompleteQuizSessionInput, type QuizResult } from '../schema';
import { eq, and } from 'drizzle-orm';

export const completeQuizSession = async (input: CompleteQuizSessionInput): Promise<QuizResult> => {
  try {
    // 1. Validate that the session exists and is not already completed
    const sessionResults = await db.select({
      id: quizSessionsTable.id,
      user_id: quizSessionsTable.user_id,
      quiz_package_id: quizSessionsTable.quiz_package_id,
      started_at: quizSessionsTable.started_at,
      is_completed: quizSessionsTable.is_completed,
      total_questions: quizSessionsTable.total_questions,
      quiz_package_title: quizPackagesTable.title
    })
      .from(quizSessionsTable)
      .innerJoin(quizPackagesTable, eq(quizSessionsTable.quiz_package_id, quizPackagesTable.id))
      .where(eq(quizSessionsTable.id, input.session_id))
      .execute();

    if (sessionResults.length === 0) {
      throw new Error('Quiz session not found');
    }

    const session = sessionResults[0];
    
    if (session.is_completed) {
      throw new Error('Quiz session is already completed');
    }

    // 2. Get all questions for the quiz package with their correct answers
    const questions = await db.select({
      id: questionsTable.id,
      correct_answer: questionsTable.correct_answer
    })
      .from(questionsTable)
      .where(eq(questionsTable.quiz_package_id, session.quiz_package_id))
      .execute();

    // Create a map for quick lookup of correct answers
    const correctAnswersMap = new Map(questions.map(q => [q.id, q.correct_answer]));

    // 3. Process user answers and calculate results
    let totalCorrect = 0;
    const userAnswerInserts = [];

    for (const answer of input.answers) {
      const correctAnswer = correctAnswersMap.get(answer.question_id);
      if (!correctAnswer) {
        throw new Error(`Question ${answer.question_id} not found in quiz package`);
      }

      const isCorrect = answer.selected_answer === correctAnswer;
      if (isCorrect) {
        totalCorrect++;
      }

      userAnswerInserts.push({
        session_id: input.session_id,
        question_id: answer.question_id,
        selected_answer: answer.selected_answer,
        is_correct: isCorrect
      });
    }

    // 4. Store all user answers
    if (userAnswerInserts.length > 0) {
      await db.insert(userAnswersTable)
        .values(userAnswerInserts)
        .execute();
    }

    // 5. Calculate score (percentage)
    const totalScore = session.total_questions > 0 
      ? Math.round((totalCorrect / session.total_questions) * 100)
      : 0;

    // 6. Calculate completion time
    const completedAt = new Date();
    const completionTimeMs = completedAt.getTime() - session.started_at.getTime();
    const completionTimeMinutes = Math.round(completionTimeMs / (1000 * 60));

    // 7. Update quiz session with completion data
    await db.update(quizSessionsTable)
      .set({
        completed_at: completedAt,
        total_correct: totalCorrect,
        total_score: totalScore,
        is_completed: true,
        time_remaining_seconds: 0 // Quiz is completed, no time remaining
      })
      .where(eq(quizSessionsTable.id, input.session_id))
      .execute();

    // 8. Return comprehensive quiz results
    return {
      session_id: input.session_id,
      user_id: session.user_id,
      quiz_package_title: session.quiz_package_title,
      total_questions: session.total_questions,
      total_correct: totalCorrect,
      total_score: totalScore,
      completion_time_minutes: completionTimeMinutes,
      completed_at: completedAt
    };

  } catch (error) {
    console.error('Quiz session completion failed:', error);
    throw error;
  }
};