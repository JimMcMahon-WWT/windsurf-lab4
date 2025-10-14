import pool from '../config/database';
import { User } from '../types/user.types';

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
}

export default new UserRepository();
