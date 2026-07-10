import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AdminGuard } from './admin.guard';

function makeContext(
  user: { id: string; role: string } | undefined,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('AdminGuard', () => {
  let guard: AdminGuard;

  beforeEach(() => {
    guard = new AdminGuard();
  });

  it('autorise un utilisateur avec le rôle admin', () => {
    expect(guard.canActivate(makeContext({ id: 'p1', role: 'admin' }))).toBe(
      true,
    );
  });

  it("throw ForbiddenException pour un utilisateur au rôle 'player'", () => {
    expect(() =>
      guard.canActivate(makeContext({ id: 'p1', role: 'player' })),
    ).toThrow(ForbiddenException);
  });

  it("throw ForbiddenException si l'utilisateur est absent de la requête", () => {
    expect(() => guard.canActivate(makeContext(undefined))).toThrow(
      ForbiddenException,
    );
  });
});
