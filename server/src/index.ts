import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  createUserInputSchema,
  loginInputSchema,
  createQuizPackageInputSchema,
  updateQuizPackageInputSchema,
  createQuestionInputSchema,
  updateQuestionInputSchema,
  startQuizSessionInputSchema,
  updateQuizSessionInputSchema,
  completeQuizSessionInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { login } from './handlers/login';
import { createQuizPackage } from './handlers/create_quiz_package';
import { getQuizPackages } from './handlers/get_quiz_packages';
import { getQuizPackageById } from './handlers/get_quiz_package_by_id';
import { updateQuizPackage } from './handlers/update_quiz_package';
import { deleteQuizPackage } from './handlers/delete_quiz_package';
import { createQuestion } from './handlers/create_question';
import { getQuestionsByPackage } from './handlers/get_questions_by_package';
import { updateQuestion } from './handlers/update_question';
import { deleteQuestion } from './handlers/delete_question';
import { startQuizSession } from './handlers/start_quiz_session';
import { getActiveQuizSession } from './handlers/get_active_quiz_session';
import { updateQuizSession } from './handlers/update_quiz_session';
import { completeQuizSession } from './handlers/complete_quiz_session';
import { getQuizResults } from './handlers/get_quiz_results';
import { getQuizResultDetails } from './handlers/get_quiz_result_details';
import { getUserStatistics } from './handlers/get_user_statistics';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
    
  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => login(input)),

  // Quiz Package routes (Admin)
  createQuizPackage: publicProcedure
    .input(createQuizPackageInputSchema)
    .mutation(({ input }) => createQuizPackage(input)),
    
  getQuizPackages: publicProcedure
    .query(() => getQuizPackages()),
    
  getQuizPackageById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getQuizPackageById(input.id)),
    
  updateQuizPackage: publicProcedure
    .input(updateQuizPackageInputSchema)
    .mutation(({ input }) => updateQuizPackage(input)),
    
  deleteQuizPackage: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteQuizPackage(input.id)),

  // Question routes (Admin)
  createQuestion: publicProcedure
    .input(createQuestionInputSchema)
    .mutation(({ input }) => createQuestion(input)),
    
  getQuestionsByPackage: publicProcedure
    .input(z.object({ packageId: z.number() }))
    .query(({ input }) => getQuestionsByPackage(input.packageId)),
    
  updateQuestion: publicProcedure
    .input(updateQuestionInputSchema)
    .mutation(({ input }) => updateQuestion(input)),
    
  deleteQuestion: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteQuestion(input.id)),

  // Quiz Session routes (User)
  startQuizSession: publicProcedure
    .input(startQuizSessionInputSchema)
    .mutation(({ input }) => startQuizSession(input)),
    
  getActiveQuizSession: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getActiveQuizSession(input.userId)),
    
  updateQuizSession: publicProcedure
    .input(updateQuizSessionInputSchema)
    .mutation(({ input }) => updateQuizSession(input)),
    
  completeQuizSession: publicProcedure
    .input(completeQuizSessionInputSchema)
    .mutation(({ input }) => completeQuizSession(input)),

  // Results and Statistics routes
  getQuizResults: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getQuizResults(input.userId)),
    
  getQuizResultDetails: publicProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(({ input }) => getQuizResultDetails(input.sessionId)),
    
  getUserStatistics: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserStatistics(input.userId)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`CPNS Quiz TRPC server listening at port: ${port}`);
  console.log('Default admin credentials: admin/admin');
  console.log('Default user credentials: user/user');
}

start();