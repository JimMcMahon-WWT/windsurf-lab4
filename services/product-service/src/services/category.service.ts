import categoryRepository from '../repositories/category.repository';
import { cacheGet, cacheSet, cacheDelete } from '../config/redis.config';
import { logger } from '../utils/logger.utils';
import { Category, CategoryResponse } from '../types/product.types';

export class CategoryService {
  /**
   * Get all categories
   */
  async getAllCategories(includeInactive: boolean = false): Promise<Category[]> {
    try {
      const cacheKey = `categories:all:${includeInactive}`;
      const cached = await cacheGet(cacheKey);
      if (cached) {
        return cached;
      }

      const categories = await categoryRepository.findAll(includeInactive);
      await cacheSet(cacheKey, categories, 3600); // Cache 1 hour

      return categories;
    } catch (error) {
      logger.error('Error getting categories:', error);
      throw error;
    }
  }

  /**
   * Get category tree (hierarchical)
   */
  async getCategoryTree(): Promise<CategoryResponse[]> {
    try {
      const cached = await cacheGet('categories:tree');
      if (cached) {
        return cached;
      }

      const flatCategories = await categoryRepository.getCategoryTree();
      const tree = this.buildCategoryTree(flatCategories);

      await cacheSet('categories:tree', tree, 3600);

      return tree;
    } catch (error) {
      logger.error('Error getting category tree:', error);
      throw error;
    }
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id: string): Promise<CategoryResponse | null> {
    try {
      const category = await categoryRepository.findById(id);
      if (!category) {
        return null;
      }

      return this.buildCategoryResponse(category);
    } catch (error) {
      logger.error('Error getting category:', error);
      throw error;
    }
  }

  /**
   * Get category by slug
   */
  async getCategoryBySlug(slug: string): Promise<CategoryResponse | null> {
    try {
      const category = await categoryRepository.findBySlug(slug);
      if (!category) {
        return null;
      }

      return this.buildCategoryResponse(category);
    } catch (error) {
      logger.error('Error getting category by slug:', error);
      throw error;
    }
  }

  /**
   * Create a category
   */
  async createCategory(data: Omit<Category, 'id' | 'created_at' | 'updated_at'>): Promise<Category> {
    try {
      const category = await categoryRepository.create(data);

      // Invalidate cache
      await this.invalidateCategoryCache();

      logger.info(`Category created: ${category.id}`);

      return category;
    } catch (error) {
      logger.error('Error creating category:', error);
      throw error;
    }
  }

  /**
   * Update a category
   */
  async updateCategory(id: string, data: Partial<Category>): Promise<Category> {
    try {
      const category = await categoryRepository.update(id, data);

      // Invalidate cache
      await this.invalidateCategoryCache();

      logger.info(`Category updated: ${id}`);

      return category;
    } catch (error) {
      logger.error('Error updating category:', error);
      throw error;
    }
  }

  /**
   * Delete a category
   */
  async deleteCategory(id: string): Promise<void> {
    try {
      await categoryRepository.delete(id);

      // Invalidate cache
      await this.invalidateCategoryCache();

      logger.info(`Category deleted: ${id}`);
    } catch (error) {
      logger.error('Error deleting category:', error);
      throw error;
    }
  }

  /**
   * Get subcategories
   */
  async getSubcategories(parentId: string | null): Promise<Category[]> {
    try {
      return await categoryRepository.findByParentId(parentId);
    } catch (error) {
      logger.error('Error getting subcategories:', error);
      throw error;
    }
  }

  /**
   * Build category tree from flat list
   */
  private buildCategoryTree(categories: any[]): CategoryResponse[] {
    const categoryMap = new Map<string, CategoryResponse>();
    const rootCategories: CategoryResponse[] = [];

    // Create map of all categories
    categories.forEach((cat) => {
      categoryMap.set(cat.id, {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        image_url: cat.image_url,
        parent: null,
        children: [],
      });
    });

    // Build tree structure
    categories.forEach((cat) => {
      const category = categoryMap.get(cat.id)!;

      if (cat.parent_id) {
        const parent = categoryMap.get(cat.parent_id);
        if (parent) {
          if (!parent.children) {
            parent.children = [];
          }
          parent.children.push(category);
          category.parent = {
            id: parent.id,
            name: parent.name,
            slug: parent.slug,
            description: parent.description,
            image_url: parent.image_url,
            parent: null,
            children: undefined,
          };
        }
      } else {
        rootCategories.push(category);
      }
    });

    return rootCategories;
  }

  /**
   * Build category response with parent/children
   */
  private async buildCategoryResponse(category: Category): Promise<CategoryResponse> {
    let parent = null;
    if (category.parent_id) {
      const parentCategory = await categoryRepository.findById(category.parent_id);
      if (parentCategory) {
        parent = {
          id: parentCategory.id,
          name: parentCategory.name,
          slug: parentCategory.slug,
          description: parentCategory.description,
          image_url: parentCategory.image_url,
          parent: null,
          children: undefined,
        };
      }
    }

    const children = await categoryRepository.findByParentId(category.id);
    const childResponses = children.length > 0
      ? children.map((child) => ({
          id: child.id,
          name: child.name,
          slug: child.slug,
          description: child.description,
          image_url: child.image_url,
          parent: null,
          children: undefined,
        }))
      : undefined;

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      image_url: category.image_url,
      parent,
      children: childResponses,
    };
  }

  /**
   * Invalidate category cache
   */
  private async invalidateCategoryCache(): Promise<void> {
    try {
      await cacheDelete('categories:all:true');
      await cacheDelete('categories:all:false');
      await cacheDelete('categories:tree');
    } catch (error) {
      logger.error('Error invalidating category cache:', error);
    }
  }
}

export default new CategoryService();
