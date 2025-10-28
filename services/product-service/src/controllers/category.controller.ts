import { Request, Response, NextFunction } from 'express';

import categoryService from '../services/category.service';

export class CategoryController {
  /**
   * Get all categories
   */
  async getAllCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { include_inactive = false } = req.query;

      const categories = await categoryService.getAllCategories(include_inactive === 'true');

      res.json(categories);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get category tree
   */
  async getCategoryTree(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tree = await categoryService.getCategoryTree();

      res.json(tree);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get category by ID
   */
  async getCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const category = await categoryService.getCategoryById(id);

      if (!category) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }

      res.json(category);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get category by slug
   */
  async getCategoryBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { slug } = req.params;

      const category = await categoryService.getCategoryBySlug(slug);

      if (!category) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }

      res.json(category);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create category
   */
  async createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = req.body;

      const category = await categoryService.createCategory(data);

      res.status(201).json(category);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update category
   */
  async updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = req.body;

      const category = await categoryService.updateCategory(id, data);

      res.json(category);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete category
   */
  async deleteCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      await categoryService.deleteCategory(id);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get subcategories
   */
  async getSubcategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { parent_id } = req.query;

      const subcategories = await categoryService.getSubcategories((parent_id as string) || null);

      res.json(subcategories);
    } catch (error) {
      next(error);
    }
  }
}

export default new CategoryController();
