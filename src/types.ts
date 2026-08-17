export type RoomStatus = "lobby" | "playing" | "round_end" | "finished";

export interface Room {
  id: string;
  code: string;
  status: RoomStatus;
  host_player_id: string | null;
  player_order: string[];
  turn_number: number;
  total_turns: number;
  total_rounds: number;
  round_seconds: number;
  current_drawer_player_id: string | null;
  current_word_length: number | null;
  round_ends_at: string | null;
  last_word: string | null;
  created_at: string;
}

export interface Player {
  id: string;
  room_id: string;
  nickname: string;
  score: number;
  is_connected: boolean;
  joined_at: string;
}

export type MessageKind = "chat" | "correct" | "system";

export interface GameMessage {
  id: number;
  room_id: string;
  player_id: string | null;
  nickname: string | null;
  turn_number: number | null;
  body: string;
  kind: MessageKind;
  created_at: string;
}

export interface StrokePoint {
  x: number;
  y: number;
}

export type DrawEvent =
  | { type: "start"; point: StrokePoint; color: string; size: number }
  | { type: "move"; point: StrokePoint }
  | { type: "end" }
  | { type: "clear" }
  | { type: "snapshot-request" }
  | { type: "snapshot"; dataUrl: string };
