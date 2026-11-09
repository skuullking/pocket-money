import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
import { io as connect, Socket } from 'socket.io-client';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import app from '../src/server';
import { getIO, initSocket, SocketEvents } from '../src/socket';
import { as, createChore, createFamily, ORIGIN, sessionCookie, useCleanDatabase } from './support/helpers';

useCleanDatabase();

let server: Server;
let url: string;
const sockets: Socket[] = [];

beforeAll(async () => {
  server = createServer(app);
  initSocket(server, ORIGIN);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterEach(() => {
  sockets.splice(0).forEach(socket => socket.disconnect());
});

afterAll(async () => {
  await getIO().close();
});

const open = (headers: Record<string, string>) => {
  const socket = connect(url, { extraHeaders: headers, transports: ['polling'], reconnection: false, forceNew: true });
  sockets.push(socket);
  return socket;
};

const connected = (socket: Socket) =>
  new Promise<void>((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
  });

const refused = (socket: Socket) =>
  new Promise<Error>((resolve, reject) => {
    socket.once('connect', () => reject(new Error('connexion acceptée')));
    socket.once('connect_error', resolve);
  });

const nextEvent = <T>(socket: Socket, event: string) => new Promise<T>(resolve => socket.once(event, resolve));

describe('temps réel', () => {
  it('refuse une connexion sans cookie', async () => {
    expect((await refused(open({ Origin: ORIGIN }))).message).toMatch(/no token/);
  });

  it('refuse un cookie invalide', async () => {
    expect((await refused(open({ Origin: ORIGIN, Cookie: 'pm_session=faux' }))).message).toMatch(/invalid token/);
  });

  it('refuse une autre origine, même avec un cookie valide', async () => {
    const { parent } = await createFamily();
    await refused(open({ Origin: 'https://evil.example', Cookie: sessionCookie(parent.id) }));
  });

  it("notifie l'enfant de l'approbation et de son nouveau solde", async () => {
    const { parent, child } = await createFamily();
    const socket = open({ Origin: ORIGIN, Cookie: sessionCookie(child.id) });
    await connected(socket);
    const chore = await createChore(child.id);
    const approved = nextEvent<{ id: string }>(socket, SocketEvents.CHORE_APPROVED);
    const balance = nextEvent<{ balance: number }>(socket, SocketEvents.BALANCE_UPDATED);

    await as(parent).patch(`/api/chores/${chore.id}/approve`).expect(200);

    expect((await approved).id).toBe(chore.id);
    expect((await balance).balance).toBe(25);
  });

  it('ne diffuse pas les événements à une autre famille', async () => {
    const { child } = await createFamily();
    const other = await createFamily('Martin');
    const own = open({ Origin: ORIGIN, Cookie: sessionCookie(child.id) });
    const foreign = open({ Origin: ORIGIN, Cookie: sessionCookie(other.parent.id) });
    await Promise.all([connected(own), connected(foreign)]);
    let leaked = false;
    foreign.on(SocketEvents.CHORE_SUBMITTED, () => {
      leaked = true;
    });
    const chore = await createChore(child.id, { status: 'PENDING' });
    const received = nextEvent(own, SocketEvents.CHORE_SUBMITTED);

    await as(child).patch(`/api/chores/${chore.id}/submit`).send({}).expect(200);

    await received;
    expect(leaked).toBe(false);
  });
});
