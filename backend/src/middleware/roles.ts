import { Request, Response, NextFunction } from 'express';

export interface JwtPayload {
  id: string;
  role: 'PARENT' | 'CHILD';
  familyId: string;
  name: string;
}

// Ex-middleware/auth.ts (supprimé — server.ts fait sa propre authentification
// inline et n'utilisait jamais ce fichier). Cette augmentation globale reste
// nécessaire pour que `req.user` type-check ici et dans tout futur code qui
// utiliserait le type `Request` d'Express plutôt que `any`.
declare global {
  namespace Express {
    interface Request {
      user: JwtPayload;
    }
  }
}

type Role = 'PARENT' | 'CHILD';

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: `Access denied. Required role: ${roles.join(' or ')}`,
      });
      return;
    }

    next();
  };
