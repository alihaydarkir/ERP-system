const events = require('./events');
const WebSocketHandlers = require('./handlers');

describe('WebSocketHandlers integration (approver targeting)', () => {
  let io;
  let handlers;
  let emitSpy;

  beforeEach(() => {
    emitSpy = jest.fn();
    io = {
      to: jest.fn(() => ({ emit: emitSpy })),
      emit: jest.fn()
    };
    handlers = new WebSocketHandlers(io);

    handlers.users.set(1, { userId: 1, role: 'manager', companyId: 10, username: 'm1' });
    handlers.users.set(2, { userId: 2, role: 'admin', companyId: 10, username: 'a1' });
    handlers.users.set(3, { userId: 3, role: 'user', companyId: 10, username: 'u1' });
    handlers.users.set(4, { userId: 4, role: 'manager', companyId: 20, username: 'm2' });
    handlers.users.set(5, { userId: 5, role: 'super_admin', companyId: 30, username: 'sa' });
  });

  test('sendToApprovers targets only approvers in same company plus super_admin', () => {
    handlers.sendToApprovers(events.AI_APPROVAL_REQUESTED, { approval_id: 11 }, { companyId: 10 });

    const rooms = io.to.mock.calls.map((c) => c[0]);
    expect(rooms).toContain('user:1');
    expect(rooms).toContain('user:2');
    expect(rooms).toContain('user:5');

    expect(rooms).not.toContain('user:3');
    expect(rooms).not.toContain('user:4');
  });

  test('sendToApprovers without companyId targets all approver roles', () => {
    handlers.sendToApprovers(events.AI_APPROVAL_UPDATED, { approval_id: 12 }, {});

    const rooms = io.to.mock.calls.map((c) => c[0]);
    expect(rooms).toContain('user:1');
    expect(rooms).toContain('user:2');
    expect(rooms).toContain('user:4');
    expect(rooms).toContain('user:5');
    expect(rooms).not.toContain('user:3');
  });

  test('sendToUser emits event to specific room', () => {
    handlers.sendToUser(2, events.NOTIFICATION, { type: 'ai_approval_status_update' });

    expect(io.to).toHaveBeenCalledWith('user:2');
    expect(emitSpy).toHaveBeenCalledWith(events.NOTIFICATION, { type: 'ai_approval_status_update' });
  });
});
