const API_URL = 'https://functions.poehali.dev/4a06cb7d-0190-406f-9420-293f32fc4e9b';

export interface SessionResponse {
  session_id: number;
  name: string;
}

export interface ShooterResponse {
  shooter_id: number;
  name: string;
}

export interface ShotResponse {
  shot_id: number;
}

export interface SessionListItem {
  id: number;
  name: string;
  created_at: string;
  completed_at: string | null;
  shooter_count: number;
  shot_count: number;
  total_score: number;
}

export interface SessionDetails {
  session: {
    id: number;
    name: string;
    created_at: string;
    completed_at: string | null;
  };
  shooters: {
    id: number;
    name: string;
    shot_count: number;
    total_score: number;
    shots: {
      score: number;
      timestamp: string;
    }[];
  }[];
}

export const api = {
  async createSession(name: string): Promise<SessionResponse> {
    const res = await fetch(`${API_URL}?action=create-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    return res.json();
  },

  async createShooter(name: string): Promise<ShooterResponse> {
    const res = await fetch(`${API_URL}?action=create-shooter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    return res.json();
  },

  async createShot(shooter_id: number, session_id: number, score: number): Promise<ShotResponse> {
    const res = await fetch(`${API_URL}?action=create-shot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shooter_id, session_id, score }),
    });
    return res.json();
  },

  async getSessions(): Promise<{ sessions: SessionListItem[] }> {
    const res = await fetch(`${API_URL}?action=get-sessions`);
    return res.json();
  },

  async getSessionDetails(session_id: number): Promise<SessionDetails> {
    const res = await fetch(`${API_URL}?action=get-session-details&session_id=${session_id}`);
    return res.json();
  },

  async completeSession(session_id: number): Promise<{ success: boolean }> {
    const res = await fetch(`${API_URL}?action=complete-session`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id }),
    });
    return res.json();
  },
};
