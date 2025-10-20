import { pool } from '../config/database.config';
import { Category } from '../types/product.types';

export class CategoryRepository {
  async findById(id: string): Promise<Category | null> {
    const result = await pool.query('SELECT * FROM categories WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async findBySlug(slug: string): Promise<Category | null> {
    const result = await pool.query('SELECT * FROM categories WHERE slug = $1', [slug]);
    return result.rows[0] || null;
  }

  async findAll(includeInactive: boolean = false): Promise<Category[]> {
    const query = includeInactive
      ? 'SELECT * FROM categories ORDER BY display_order, name'
      : 'SELECT * FROM categories WHERE is_active = TRUE ORDER BY display_order, name';
    
    const result = await pool.query(query);
    return result.rows;
  }

  async findByParentId(parentId: string | null): Promise<Category[]> {
    const query = parentId
      ? 'SELECT * FROM categories WHERE parent_id = $1 AND is_active = TRUE ORDER BY display_order, name'
      : 'SELECT * FROM categories WHERE parent_id IS NULL AND is_active = TRUE ORDER BY display_order, name';
    
    const params = parentId ? [parentId] : [];
    const result = await pool.query(query, params);
    return result.rows;
  }

  async create(data: Omit<Category, 'id' | 'created_at' | 'updated_at'>): Promise<Category> {
    const result = await pool.query(
      `INSERT INTO categories (name, slug, description, parent_id, image_url, is_active, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.name,
        data.slug,
        data.description || null,
        data.parent_id || null,
        data.image_url || null,
        data.is_active !== undefined ? data.is_active : true,
        data.display_order || 0,
      ]
    );
    return result.rows[0];
  }

  async update(id: string, data: Partial<Category>): Promise<Category> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'created_at') {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      return (await this.findById(id))!;
    }

    values.push(id);

    const query = `
      UPDATE categories 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    await pool.query('DELETE FROM categories WHERE id = $1', [id]);
  }

  async getCategoryTree(): Promise<Category[]> {
    const query = `
      WITH RECURSIVE category_tree AS (
        SELECT *, 0 as level
        FROM categories
        WHERE parent_id IS NULL AND is_active = TRUE
        
        UNION ALL
        
        SELECT c.*, ct.level + 1
        FROM categories c
        INNER JOIN category_tree ct ON c.parent_id = ct.id
        WHERE c.is_active = TRUE
      )
      SELECT * FROM category_tree
      ORDER BY level, display_order, name
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }
}

export default new CategoryRepository();
