const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requirePermission, logActivity } = require('../middleware/permissions');
const { validate, productSchemas, querySchemas } = require('../utils/validators');
const {
  getAllProducts, getProductById,
  createProduct, updateProduct, deleteProduct,
} = require('../controllers/productController');

/**
 * @openapi
 * /api/products:
 *   get:
 *     tags: [Products]
 *     summary: Ürünleri listele (sayfalama + filtreleme)
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Ad / SKU arama
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: lowStock
 *         schema: { type: integer }
 *         description: Stok eşiği altındaki ürünler
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Ürün listesi
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/PaginatedResponse' }
 */
router.get('/', authMiddleware, requirePermission('products.view'),
  validate(querySchemas.productFilters, 'query'), getAllProducts);

/**
 * @openapi
 * /api/products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Tekil ürün getir
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Ürün detayı
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *       404:
 *         description: Bulunamadı
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get('/:id', authMiddleware, requirePermission('products.view'), getProductById);

/**
 * @openapi
 * /api/products:
 *   post:
 *     tags: [Products]
 *     summary: Yeni ürün oluştur
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, price]
 *             properties:
 *               name:                { type: string }
 *               sku:                 { type: string }
 *               category:            { type: string }
 *               price:               { type: number }
 *               stock_quantity:      { type: integer, default: 0 }
 *               low_stock_threshold: { type: integer, default: 10 }
 *               description:         { type: string }
 *               supplier_id:         { type: integer }
 *               warehouse_id:        { type: integer }
 *     responses:
 *       201:
 *         description: Ürün oluşturuldu
 *       400:
 *         description: Validasyon hatası
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post('/', authMiddleware, requirePermission('products.create'),
  validate(productSchemas.create), logActivity('create_product', 'products'), createProduct);

/**
 * @openapi
 * /api/products/{id}:
 *   put:
 *     tags: [Products]
 *     summary: Ürünü güncelle
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Product' }
 *     responses:
 *       200:
 *         description: Güncellendi
 *   delete:
 *     tags: [Products]
 *     summary: Ürünü sil
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Silindi
 *       404:
 *         description: Bulunamadı
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.put('/:id', authMiddleware, requirePermission('products.edit'),
  validate(productSchemas.update), logActivity('update_product', 'products'), updateProduct);
router.delete('/:id', authMiddleware, requirePermission('products.delete'),
  logActivity('delete_product', 'products'), deleteProduct);

module.exports = router;

