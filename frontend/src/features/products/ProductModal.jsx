import { useModalAccessibility } from '../../hooks/useModalAccessibility.js';
import React, { useState, useEffect } from 'react';
import api from '../../services/api.js';
import { X, Package, AlertCircle } from 'lucide-react';

export default function ProductModal({ isOpen, onClose, productToEdit, onSaved }) {
  const [formData, setFormData] = useState({
    itemType: 'FRAME',
    brand: '',
    modelCode: '',
    name: '',
    description: '',
    costPrice: '',
    sellingPrice: '',
    stockQuantity: 0,
    minStockAlert: 3,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (productToEdit) {
      setFormData({
        itemType: productToEdit.item_type || 'FRAME',
        brand: productToEdit.brand || '',
        modelCode: productToEdit.model_code || '',
        name: productToEdit.name || '',
        description: productToEdit.description || '',
        costPrice: productToEdit.cost_price || '',
        sellingPrice: productToEdit.selling_price || '',
        stockQuantity: productToEdit.stock_quantity || 0,
        minStockAlert: productToEdit.min_stock_alert || 3,
      });
    } else {
      setFormData({
        itemType: 'FRAME',
        brand: '',
        modelCode: '',
        name: '',
        description: '',
        costPrice: '',
        sellingPrice: '',
        stockQuantity: 0,
        minStockAlert: 3,
      });
    }
    setError('');
  }, [productToEdit, isOpen]);

  const modalRef = useModalAccessibility(isOpen, onClose);
  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        itemType: formData.itemType,
        brand: formData.brand || null,
        modelCode: formData.modelCode || null,
        name: formData.name,
        description: formData.description || null,
        costPrice: parseFloat(formData.costPrice) || 0,
        sellingPrice: parseFloat(formData.sellingPrice) || 0,
        stockQuantity: parseInt(formData.stockQuantity, 10) || 0,
        minStockAlert: parseInt(formData.minStockAlert, 10) || 3,
      };

      if (productToEdit) {
        await api.put(`/products/${productToEdit.id}`, payload);
      } else {
        await api.post('/products', payload);
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={modalRef} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#203A36]/40 backdrop-blur-xs">
      <div className="bg-[#FEFEFC] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E2E7E3] animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-[#E2E7E3]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EBF3F1] text-[#28766B] flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-[#202D2B]">
              {productToEdit ? 'Edit Product Stock' : 'Add New Product to Stock'}
            </h2>
          </div>
          <button aria-label="Close dialog" onClick={onClose} className="p-1.5 text-[#66746F] hover:text-[#202D2B] rounded-lg hover:bg-[#F5F7F3]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-4 p-3 rounded-xl bg-red-50/80 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="ProductModal-field-0" className="block text-xs font-semibold text-[#66746F] mb-1">Category / Type *</label>
              <select id="ProductModal-field-0"
                value={formData.itemType}
                onChange={(e) => setFormData({ ...formData, itemType: e.target.value })}
                className="w-full px-3 py-2 border border-[#E2E7E3] rounded-xl text-xs bg-[#FEFEFC] text-[#202D2B] focus:border-[#28766B] focus:ring-1 focus:ring-[#28766B] focus:outline-none font-medium"
              >
                <option value="FRAME">Frame</option>
                <option value="LENS">Lens</option>
                <option value="SUNGLASSES">Sunglasses</option>
                <option value="CONTACT_LENS">Contact Lens</option>
                <option value="SOLUTION">Solution</option>
                <option value="ACCESSORY">Accessory</option>
                <option value="SERVICE">Service</option>
              </select>
            </div>

            <div>
              <label htmlFor="ProductModal-field-1" className="block text-xs font-semibold text-[#66746F] mb-1">Brand Name</label>
              <input id="ProductModal-field-1"
                type="text"
                placeholder="e.g. Ray-Ban, Fastrack"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="w-full px-3 py-2 border border-[#E2E7E3] rounded-xl text-xs bg-[#FEFEFC] text-[#202D2B] focus:border-[#28766B] focus:ring-1 focus:ring-[#28766B] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label htmlFor="ProductModal-field-2" className="block text-xs font-semibold text-[#66746F] mb-1">Product Name / Title *</label>
              <input id="ProductModal-field-2"
                type="text"
                required
                placeholder="e.g. Aviator Classic Gold 58mm"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-[#E2E7E3] rounded-xl text-xs bg-[#FEFEFC] text-[#202D2B] focus:border-[#28766B] focus:ring-1 focus:ring-[#28766B] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="ProductModal-field-3" className="block text-xs font-semibold text-[#66746F] mb-1">Model / Code</label>
              <input id="ProductModal-field-3"
                type="text"
                placeholder="e.g. RB3025"
                value={formData.modelCode}
                onChange={(e) => setFormData({ ...formData, modelCode: e.target.value })}
                className="w-full px-3 py-2 border border-[#E2E7E3] rounded-xl text-xs bg-[#FEFEFC] text-[#202D2B] focus:border-[#28766B] focus:ring-1 focus:ring-[#28766B] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="ProductModal-field-4" className="block text-xs font-semibold text-[#66746F] mb-1">Cost Price (₹)</label>
              <input id="ProductModal-field-4"
                type="number"
                placeholder="0"
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                className="w-full px-3 py-2 border border-[#E2E7E3] rounded-xl text-xs font-mono tabular-nums bg-[#FEFEFC] text-[#202D2B] focus:border-[#28766B] focus:ring-1 focus:ring-[#28766B] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="ProductModal-field-5" className="block text-xs font-semibold text-[#66746F] mb-1">Selling Price (₹) *</label>
              <input id="ProductModal-field-5"
                type="number"
                required
                placeholder="0"
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                className="w-full px-3 py-2 border border-[#E2E7E3] rounded-xl text-xs font-mono font-bold text-[#28766B] tabular-nums bg-[#FEFEFC] focus:border-[#28766B] focus:ring-1 focus:ring-[#28766B] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="ProductModal-field-6" className="block text-xs font-semibold text-[#66746F] mb-1">Initial Stock Qty</label>
              <input id="ProductModal-field-6"
                type="number"
                value={formData.stockQuantity}
                onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                className="w-full px-3 py-2 border border-[#E2E7E3] rounded-xl text-xs font-mono tabular-nums bg-[#FEFEFC] text-[#202D2B] focus:border-[#28766B] focus:ring-1 focus:ring-[#28766B] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="ProductModal-field-7" className="block text-xs font-semibold text-[#66746F] mb-1">Low Stock Alert Level</label>
              <input id="ProductModal-field-7"
                type="number"
                value={formData.minStockAlert}
                onChange={(e) => setFormData({ ...formData, minStockAlert: e.target.value })}
                className="w-full px-3 py-2 border border-[#E2E7E3] rounded-xl text-xs font-mono tabular-nums bg-[#FEFEFC] text-[#202D2B] focus:border-[#28766B] focus:ring-1 focus:ring-[#28766B] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-[#E2E7E3]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#66746F] hover:text-[#202D2B] bg-[#FEFEFC] border border-[#E2E7E3] hover:bg-[#F5F7F3] rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#28766B] hover:bg-[#1E5C53] rounded-xl shadow-xs disabled:opacity-50 transition"
            >
              {loading ? 'Saving...' : productToEdit ? 'Update Stock' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}