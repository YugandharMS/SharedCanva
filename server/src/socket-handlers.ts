// server/src/socket-handlers.ts
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import { Server, Socket } from "socket.io";
import { roomStore, Room, Member, MemberSnapshot } from "./rooms";

// Stroke validation that accepts either `width` or `size` and normalizes
function isValidStroke(stroke: any): boolean {
  if (!stroke) return false;
  if (typeof stroke.color !== "string") return false;
  const hasWidth = typeof stroke.width === "number";
  const hasSize = typeof stroke.size === "number";
  if (!hasWidth && !hasSize) return false;
  if (!Array.isArray(stroke.points)) return false;
  return stroke.points.every(
    (pt: any) =>
      pt &&
      typeof pt.x === "number" &&
      typeof pt.y === "number" &&
      Number.isFinite(pt.x) &&
      Number.isFinite(pt.y)
  );
}

type ProfilePayload = {
  clientId?: string;
  displayName?: string;
  avatar?: string;
};

const ADJECTIVES = [
  "Agile",
  "Bold",
  "Calm",
  "Daring",
  "Eager",
  "Fierce",
  "Gentle",
  "Lively",
  "Mighty",
  "Nimble",
  "Quick",
  "Rapid",
  "Serene",
  "Swift",
  "Vivid",
];

const NOUNS = [
  "Artist",
  "Brush",
  "Canvas",
  "Creator",
  "Designer",
  "Explorer",
  "Maker",
  "Painter",
  "Sketcher",
  "Visionary",
];

const AVATARS = ["🎨", "🖌️", "🧠", "🧩", "✨", "🎯", "🛠️", "🪄", "🌈", "🎲"];

const pickRandom = (items: string[]): string =>
  items[Math.floor(Math.random() * items.length)] ?? items[0] ?? "";

const sanitizeClientId = (value?: string): string => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (trimmed.length >= 6) {
    return trimmed.slice(0, 64);
  }
  return randomUUID();
};

const sanitizeDisplayName = (value?: string): string => {
  if (typeof value === "string") {
    const trimmed = value.trim().replace(/[\r\n\t]+/g, " ");
    if (trimmed.length >= 2) {
      return trimmed.slice(0, 60);
    }
  }
  return `${pickRandom(ADJECTIVES)} ${pickRandom(NOUNS)}`;
};

const sanitizeAvatar = (value?: string): string => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim().slice(0, 4);
  }
  return pickRandom(AVATARS);
};

const buildProfile = (profile?: ProfilePayload) => ({
  clientId: sanitizeClientId(profile?.clientId),
  displayName: sanitizeDisplayName(profile?.displayName),
  avatar: sanitizeAvatar(profile?.avatar),
});

const toSnapshot = (member: Member | null): MemberSnapshot | null => {
  if (!member) return null;
  return {
    memberId: member.memberId,
    clientId: member.clientId,
    displayName: member.displayName,
    avatar: member.avatar,
    isHost: member.isHost,
    joinedAt: member.joinedAt,
    status: member.status,
  };
};

export function registerSocketHandlers(io: Server, socket: Socket) {
  const emitMembers = (code: string) => {
    const members = roomStore.getMembersSnapshot(code);
    io.to(code).emit("room:members", { members });
  };

  // --- Create Room ---
  socket.on(
    "create-room",
    async (
      { password, profile }: { password?: string; profile?: ProfilePayload },
      callback,
    ) => {
      try {
        const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;
        const room: Room = roomStore.createRoom(passwordHash);
        const normalizedProfile = buildProfile(profile);

        const member = roomStore.upsertMember(room.code, {
          socketId: socket.id,
          clientId: normalizedProfile.clientId,
          displayName: normalizedProfile.displayName,
          avatar: normalizedProfile.avatar,
          isHost: true,
        });

        socket.join(room.code);
        emitMembers(room.code);

        callback({
          success: true,
          roomCode: room.code,
          isHost: true,
          members: roomStore.getMembersSnapshot(room.code),
          self: toSnapshot(member),
        });
      } catch (err) {
        console.error("Error creating room:", err);
        callback({ success: false, error: "Could not create room" });
      }
    },
  );

  // --- Join Room ---
  socket.on(
    "join-room",
    async (
      { code, password, profile }: { code: string; password?: string; profile?: ProfilePayload },
      callback,
    ) => {
      const room = roomStore.getRoom(code);

      if (!room) {
        return callback({ success: false, error: "Room not found" });
      }

      if (room.passwordHash) {
        const valid = await bcrypt.compare(password || "", room.passwordHash);
        if (!valid) {
          return callback({ success: false, error: "Invalid password" });
        }
      }

      const normalizedProfile = buildProfile(profile);
      const member = roomStore.upsertMember(code, {
        socketId: socket.id,
        clientId: normalizedProfile.clientId,
        displayName: normalizedProfile.displayName,
        avatar: normalizedProfile.avatar,
        isHost: false,
      });

      socket.join(code);
      emitMembers(code);

      if (room.canvasData) {
        socket.emit("canvas:snapshot", room.canvasData);
      } else if (room.history.length > 0) {
        socket.emit("canvas:history", room.history);
      }

      callback({
        success: true,
        roomCode: code,
        isHost: !!member?.isHost,
        members: roomStore.getMembersSnapshot(code),
        self: toSnapshot(member),
      });
    },
  );

  // --- Canvas: broadcast strokes ---
  socket.on("canvas:stroke", ({ code: codeParam, roomCode, stroke }) => {
    const code = codeParam || roomCode;
    if (!code) return;
    const room = roomStore.getRoom(code);
    if (!room) return;

    if (!isValidStroke(stroke)) {
      console.warn("Invalid stroke rejected from", socket.id);
      return;
    }

    const normalizedId = typeof stroke.id === "string" && stroke.id.trim().length > 0
      ? stroke.id
      : randomUUID().slice(0, 12);

    const normalized = {
      id: normalizedId,
      tool: stroke.tool === "eraser" ? "eraser" : "pen",
      color: stroke.color,
      width: typeof stroke.width === "number" ? stroke.width : stroke.size,
      points: stroke.points.map((p: any) => ({
        x: p.x,
        y: p.y,
        pressure:
          typeof p.pressure === "number" && Number.isFinite(p.pressure)
            ? p.pressure
            : 0.5,
      })),
      createdAt: stroke.createdAt || Date.now(),
    };

    room.history.push(normalized);
    if (room.history.length > 5000) {
      room.history.shift();
    }
    room.lastActive = Date.now();

    io.to(code).emit("canvas:stroke", normalized);
  });

  // --- Canvas: undo stroke ---
  socket.on("canvas:undo", ({ code: codeParam, roomCode, strokeId }) => {
    const code = codeParam || roomCode;
    if (!code || typeof strokeId !== "string") return;
    const room = roomStore.getRoom(code);
    if (!room) return;

    const index = room.history.findIndex((entry: any) => entry && entry.id === strokeId);
    if (index === -1) return;

    room.history.splice(index, 1);
    room.lastActive = Date.now();
    if (typeof room.canvasData === "string" && room.canvasData.trim().startsWith("{")) {
      room.canvasData = null;
    }
    io.to(code).emit("canvas:undo", { strokeId });
  });

  // --- Canvas: request snapshot ---
  socket.on("canvas:request-snapshot", ({ code, roomCode }) => {
    const room = roomStore.getRoom(code || roomCode);
    if (!room) return;

    if (room.canvasData) {
      socket.emit("canvas:snapshot", room.canvasData);
    } else if (room.history.length > 0) {
      socket.emit("canvas:history", room.history);
    }
  });

  // --- Canvas: save snapshot ---
  socket.on("canvas:save-snapshot", ({ code, roomCode, snapshot }) => {
    const room = roomStore.getRoom(code || roomCode);
    if (!room) return;
    if (typeof snapshot !== "string") return;

    const trimmed = snapshot.trim();
    if (trimmed.startsWith("{")) {
      room.canvasData = trimmed;
    } else if (trimmed.startsWith("data:image/")) {
      room.canvasData = trimmed;
    } else {
      return;
    }
    room.lastActive = Date.now();
  });

  // --- Handle Disconnect ---
  socket.on("disconnect", () => {
    for (const [code] of roomStore.listRooms()) {
      const removed = roomStore.removeMemberBySocketId(code, socket.id);
      if (removed) {
        emitMembers(code);
      }
    }
  });
}
