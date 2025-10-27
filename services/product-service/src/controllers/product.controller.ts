import { Request, Response, NextFunction } from 'express';

import productService from '../services/product.service';
import searchService from '../services/search.service';

export class ProductController {
  /**
   * Get product by ID
   */
  async getProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const product = await productService.getProductById(id);

      if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      res.json(product);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get product by slug
   */
  async getProductBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { slug } = req.params;
      const product = await productService.getProductBySlug(slug);

      if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      res.json(product);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all products with filters
   */
  async getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page = 1, limit = 20, ...filters } = req.query;

      const result = await productService.getProducts(
        filters,
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search products
   */
  async searchProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const searchQuery = req.query;
      const result = await searchService.search(searchQuery);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get autocomplete suggestions
   */
  async autocomplete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { q, limit = 10 } = req.query;

      if (!q) {
        res.json([]);
        return;
      }

      const suggestions = await searchService.autocomplete(
        q as string,
        parseInt(limit as string)
      );

      res.json(suggestions);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a product
   */
  async createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = req.body;
      const images = req.files as Express.Multer.File[];

      const product = await productService.createProduct(data, images);

      res.status(201).json(product);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a product
   */
  async updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = req.body;

      const product = await productService.updateProduct(id, data);

      res.json(product);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a product
   */
  async deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      await productService.deleteProduct(id);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload product images
   */
  async uploadImages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        res.status(400).json({ error: 'No files provided' });
        return;
      }

      await productService.uploadProductImages(id, files);

      res.json({ message: 'Images uploaded successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get featured products
   */
  async getFeaturedProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { limit = 10 } = req.query;

      const products = await productService.getFeaturedProducts(parseInt(limit as string));

      res.json(products);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get bestsellers
   */
  async getBestSellers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { limit = 10 } = req.query;

      const products = await productService.getBestSellers(parseInt(limit as string));

      res.json(products);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get new arrivals
   */
  async getNewArrivals(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { limit = 10 } = req.query;

      const products = await productService.getNewArrivals(parseInt(limit as string));

      res.json(products);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create product variant
   */
  async createVariant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = req.body;

      const variant = await productService.createVariant(data);

      res.status(201).json(variant);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk operations
   */
  async bulkOperation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const operation = req.body;

      await productService.bulkOperation(operation);

      res.json({ message: 'Bulk operation completed successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export default new ProductController();
