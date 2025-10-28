import { pool } from '../config/database.config';
import { User, UserPreferences, RefreshToken, Session } from '../types/user.types';

export class UserRepository {
  async findById(id: string): Promise<User | null> {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  }

  async create(
    email: string,
    passwordHash: string,
    firstName?: string,
    lastName?: string,
    phone?: string
  ): Promise<User> {
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [email, passwordHash, firstName || null, lastName || null, phone || null]
    );
    return result.rows[0];
  }

  async update(id: string, updates: Partial<User>): Promise<User> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE users 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async updateLastLogin(id: string): Promise<void> {
    await pool.query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
  }

  async delete(id: string): Promise<void> {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
  }

  // Password Reset Methods
  async setResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expires_at = $2 WHERE id = $3',
      [token, expiresAt, userId]
    );
  }

  async findByResetToken(token: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires_at > NOW()',
      [token]
    );
    return result.rows[0] || null;
  }

  async clearResetToken(userId: string): Promise<void> {
    await pool.query(
      'UPDATE users SET reset_token = NULL, reset_token_expires_at = NULL WHERE id = $1',
      [userId]
    );
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
  }

  // Refresh Token Methods
  async createRefreshToken(
    userId: string,
    token: string,
    expiresAt: Date,
    createdByIp?: string
  ): Promise<RefreshToken> {
    const result = await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at, created_by_ip)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, token, expiresAt, createdByIp || null]
    );
    return result.rows[0];
  }

  async findRefreshToken(token: string): Promise<RefreshToken | null> {
    const result = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND revoked_at IS NULL',
      [token]
    );
    return result.rows[0] || null;
  }

  async revokeRefreshToken(
    token: string,
    replacedByToken?: string,
    revokedByIp?: string
  ): Promise<void> {
    await pool.query(
      `UPDATE refresh_tokens 
       SET revoked_at = CURRENT_TIMESTAMP, replaced_by_token = $1, revoked_by_ip = $2
       WHERE token = $3`,
      [replacedByToken || null, revokedByIp || null, token]
    );
  }

  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await pool.query(
      'UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND revoked_at IS NULL',
      [userId]
    );
  }

  async deleteExpiredRefreshTokens(): Promise<void> {
    await pool.query('DELETE FROM refresh_tokens WHERE expires_at < NOW()');
  }

  // User Preferences Methods
  async getPreferences(userId: string): Promise<UserPreferences | null> {
    const result = await pool.query('SELECT * FROM user_preferences WHERE user_id = $1', [userId]);
    return result.rows[0] || null;
  }

  async createPreferences(userId: string): Promise<UserPreferences> {
    const result = await pool.query(
      'INSERT INTO user_preferences (user_id) VALUES ($1) RETURNING *',
      [userId]
    );
    return result.rows[0];
  }

  async updatePreferences(
    userId: string,
    updates: Partial<UserPreferences>
  ): Promise<UserPreferences> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'user_id' && key !== 'created_at') {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      // No updates, just return current preferences
      return (await this.getPreferences(userId))!;
    }

    values.push(userId);

    const query = `
      UPDATE user_preferences 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Session Methods
  async createSession(
    userId: string,
    sessionToken: string,
    expiresAt: Date,
    ipAddress?: string,
    userAgent?: string
  ): Promise<Session> {
    const result = await pool.query(
      `INSERT INTO sessions (user_id, session_token, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, sessionToken, expiresAt, ipAddress || null, userAgent || null]
    );
    return result.rows[0];
  }

  async findSession(sessionToken: string): Promise<Session | null> {
    const result = await pool.query(
      'SELECT * FROM sessions WHERE session_token = $1 AND expires_at > NOW()',
      [sessionToken]
    );
    return result.rows[0] || null;
  }

  async updateSessionActivity(sessionToken: string): Promise<void> {
    await pool.query(
      'UPDATE sessions SET last_activity_at = CURRENT_TIMESTAMP WHERE session_token = $1',
      [sessionToken]
    );
  }

  async deleteSession(sessionToken: string): Promise<void> {
    await pool.query('DELETE FROM sessions WHERE session_token = $1', [sessionToken]);
  }

  async deleteAllUserSessions(userId: string): Promise<void> {
    await pool.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
  }

  async deleteExpiredSessions(): Promise<void> {
    await pool.query('DELETE FROM sessions WHERE expires_at < NOW()');
  }

  // Audit Log Method
  async createAuditLog(
    userId: string | null,
    action: string,
    resourceType?: string,
    resourceId?: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, ip_address, user_agent, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        action,
        resourceType || null,
        resourceId || null,
        ipAddress || null,
        userAgent || null,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );
  }
}

export default new UserRepository();
