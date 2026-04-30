const express = require('express');
const router = express.Router({ mergeParams: true });
const productCtrl = require('../controllers/productController');
const stageCtrl = require('../controllers/stageController');
const invCtrl = require('../controllers/inventoryController');
const billCtrl = require('../controllers/billingController');
const empCtrl = require('../controllers/employeeController');
const tmplCtrl = require('../controllers/templateController');
const { authenticate, requireOwner, requireMember } = require('../middleware/auth');
const { uploadProductImage } = require('../config/cloudinary');
const multer = require('multer');

const upload = uploadProductImage.fields([
  { name: 'conceptImage', maxCount: 1 },
  { name: 'buildImage', maxCount: 1 },
]);

router.use(authenticate);

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────
router.get('/:workspaceId/products', requireMember, productCtrl.getProducts);
router.get('/:workspaceId/products/:productId', requireMember, productCtrl.getProduct);
router.post('/:workspaceId/products', requireOwner, upload, productCtrl.createProduct);
router.put('/:workspaceId/products/:productId', requireOwner, upload, productCtrl.updateProduct);
router.delete('/:workspaceId/products/:productId', requireOwner, productCtrl.deleteProduct);
router.post('/:workspaceId/products/:productId/save-template', requireOwner, productCtrl.saveAsTemplate);

// ─── STAGES ───────────────────────────────────────────────────────────────────
router.get('/:workspaceId/my-tasks', requireMember, stageCtrl.getMyTasks);
router.post('/:workspaceId/products/:productId/stages', requireOwner, stageCtrl.addStage);
router.put('/:workspaceId/stages/:stageId/status', requireMember, stageCtrl.updateStageStatus);
router.put('/:workspaceId/stages/:stageId/assign', requireOwner, stageCtrl.assignStage);
router.delete('/:workspaceId/stages/:stageId', requireOwner, stageCtrl.deleteStage);

// ─── INVENTORY ────────────────────────────────────────────────────────────────
router.get('/:workspaceId/inventory', requireMember, invCtrl.getInventory);
router.get('/:workspaceId/inventory/summary', requireOwner, invCtrl.getInventorySummary);
router.post('/:workspaceId/inventory', requireOwner, invCtrl.addItem);
router.put('/:workspaceId/inventory/:itemId', requireOwner, invCtrl.updateItem);
router.patch('/:workspaceId/inventory/:itemId/adjust', requireOwner, invCtrl.adjustStock);
router.delete('/:workspaceId/inventory/:itemId', requireOwner, invCtrl.deleteItem);

// ─── BILLING ──────────────────────────────────────────────────────────────────
router.get('/:workspaceId/bills', requireOwner, billCtrl.getBills);
router.get('/:workspaceId/bills/summary', requireOwner, billCtrl.getBillingSummary);
router.get('/:workspaceId/bills/:billId', requireOwner, billCtrl.getBill);
router.post('/:workspaceId/bills', requireOwner, billCtrl.createBill);
router.put('/:workspaceId/bills/:billId', requireOwner, billCtrl.updateBill);
router.delete('/:workspaceId/bills/:billId', requireOwner, billCtrl.deleteBill);

// ─── EMPLOYEES ────────────────────────────────────────────────────────────────
router.get('/:workspaceId/employees', requireOwner, empCtrl.getEmployees);
router.get('/:workspaceId/employees/:userId', requireOwner, empCtrl.getEmployeeDetails);

// ─── TEMPLATES ────────────────────────────────────────────────────────────────
router.get('/:workspaceId/templates', requireMember, tmplCtrl.getTemplates);
router.get('/:workspaceId/templates/:templateId', requireMember, tmplCtrl.getTemplate);
router.post('/:workspaceId/templates', requireOwner, tmplCtrl.createTemplate);
router.delete('/:workspaceId/templates/:templateId', requireOwner, tmplCtrl.deleteTemplate);

module.exports = router;
