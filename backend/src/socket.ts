import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { readAuthCookie } from './authCookie';

const prisma = new PrismaClient();

interface SocketUser {
  id: string;
  role: string;
  familyId: string;
  name: string;
}

let io: SocketIOServer;

export function initSocket(httpServer: HttpServer, clientOrigin: string): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: clientOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // CORS ne s'applique pas aux WebSockets : sans ce contrôle, un autre site
    // pourrait ouvrir une connexion authentifiée par le cookie de la victime.
    allowRequest: (req, callback) => {
      const { origin } = req.headers;
      callback(null, !origin || origin === clientOrigin);
    },
  });

  io.use(async (socket: Socket, next) => {
    const token = readAuthCookie(socket.handshake.headers.cookie);
    if (!token) return next(new Error('Authentication error: no token'));

    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) throw new Error('JWT_SECRET not configured');

      // generateToken() in server.ts only signs { userId } — look the user
      // up in the DB rather than trusting a richer shape in the token itself.
      const decoded = jwt.verify(token, secret) as { userId: string };
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (!user) return next(new Error('Authentication error: user not found'));

      (socket as Socket & { user: SocketUser }).user = {
        id: user.id, role: user.role, familyId: user.familyId, name: user.name,
      };
      next();
    } catch {
      next(new Error('Authentication error: invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as Socket & { user: SocketUser }).user;

    if (user) {
      // Join family room for broadcast events
      socket.join(`family:${user.familyId}`);
      // Join user-specific room for targeted events
      socket.join(`user:${user.id}`);

      console.log(
        `Socket connected: user=${user.name} (${user.id}), family=${user.familyId}`
      );

      socket.on('disconnect', () => {
        console.log(`Socket disconnected: user=${user.name} (${user.id})`);
      });
    }
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initSocket first.');
  }
  return io;
}

export function emitToFamily(
  familyId: string,
  event: string,
  data: unknown
): void {
  if (!io) return;
  io.to(`family:${familyId}`).emit(event, data);
}

export function emitToUser(
  userId: string,
  event: string,
  data: unknown
): void {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}

// Un compte supprimé ne doit plus recevoir les événements de la famille. Sans
// fermeture du transport : l'événement émis juste avant arrive d'abord au client.
export function disconnectUser(userId: string): void {
  if (!io) return;
  io.in(`user:${userId}`).disconnectSockets();
}

export function disconnectFamily(familyId: string): void {
  if (!io) return;
  io.in(`family:${familyId}`).disconnectSockets();
}

// Socket event type constants
export const SocketEvents = {
  ACCOUNT_DELETED: 'account:deleted',
  MEMBER_REMOVED: 'member:removed',
  EXPENSE_REQUESTED: 'expense:requested',
  EXPENSE_APPROVED: 'expense:approved',
  EXPENSE_REJECTED: 'expense:rejected',
  EXPENSE_DEDUCTED: 'expense:deducted',
  CHORE_SUBMITTED: 'chore:submitted',
  CHORE_APPROVED: 'chore:approved',
  CHORE_REJECTED: 'chore:rejected',
  BALANCE_UPDATED: 'balance:updated',
  PENALTY_APPLIED: 'penalty:applied',
  GOAL_FUNDED: 'goal:funded',
} as const;
