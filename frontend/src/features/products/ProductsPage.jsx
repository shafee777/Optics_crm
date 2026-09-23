import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api.js';
import { SkeletonTable, SkeletonStatGrid, SkeletonCard } from '../../components/common/Skeleton.jsx';
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle, 
  Edit, 
  Trash2, 
  PlusCircle, 
  MinusCircle,
  Glasses,
  Truck,
  Building2,
  DollarSign,
  Calendar,
  CheckCircle2,
  Phone,
  Mail,
  FileText
} from 'lucide-react';
import ProductModal from './ProductModal.jsx';
import SupplierModal from '../inventory/SupplierModal.jsx';
import NewPurchaseOrderModal from '../inventory/NewPurchaseOrderModal.jsx';
import RecordSupplierPaymentModal from '../inventory/RecordSupplierPaymentModal.jsx';

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'purchases' | 'suppliers'

  // Stock inventory state
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Purchase orders state
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [selectedPoForPayment, setSelectedPoForPayment] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Suppliers state
  const [suppliers, setSuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierCategory, setSupplierCategory] = useState('ALL');
  const [duesSummary, setDuesSummary] = useState(null);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  // 1. Fetch Products
  const fetchProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedType) params.append('itemType', selectedType);
      if (lowStockOnly) params.append('lowStockOnly', 'true');

      const res = await api.get(`/products?${params.toString()}`);
      setProducts(res.data.data);
    } catch (err) {
      console.error('Failed to fetch products', err);
    } finally {
      setLoadingProducts(false);
    }
  }, [searchTerm, selectedType, lowStockOnly]);

  // 2. Fetch Purchase Orders
  const fetchPurchaseOrders = useCallback(async () => {
    try {
      setLoadingPurchases(true);
      const res = await api.get('/purchases');
      setPurchaseOrders(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch purchase orders', err);
    } finally {
      setLoadingPurchases(false);
    }
  }, []);

  // 3. Fetch Suppliers & Dues
  const fetchSuppliers = useCallback(async () => {
    try {
      setLoadingSuppliers(true);
      const params = new URLSearchParams();
      if (supplierCategory && supplierCategory !== 'ALL') params.append('category', supplierCategory);
      if (supplierSearch) params.append('search', supplierSearch);

      const [supRes, duesRes] = await Promise.all([
        api.get(`/suppliers?${params.toString()}`),
        api.get('/suppliers/dues-summary'),
      ]);
      setSuppliers(supRes.data.data || []);
      setDuesSummary(duesRes.data.data || null);
    } catch (err) {
      console.error('Failed to fetch suppliers', err);
    } finally {
      setLoadingSuppliers(false);
    }
  }, [supplierCategory, supplierSearch]);

  useEffect(() => {
    if (activeTab === 'inventory') {
      const timer = setTimeout(fetchProducts, 300);
      return () => clearTimeout(timer);
    } else if (activeTab === 'purchases') {
      fetchPurchaseOrders();
      fetchSuppliers();
    } else if (activeTab === 'suppliers') {
      fetchSuppliers();
    }
  }, [activeTab, fetchProducts, fetchPurchaseOrders, fetchSuppliers]);

  // Product Adjustments
  const handleAdjustStock = async (id, adjustment) => {
    try {
      await api.patch(`/products/${id}/stock`, { adjustment });
      fetchProducts();
    } catch (err) {
      console.error('Failed to adjust stock', err);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to remove this product from inventory?')) return;
    try {
      await api.delete(`/products/${id}`);
      fetchProducts();
    } catch (err) {
      console.error('Failed to delete product', err);
    }
  };

  const handleDeleteSupplier = async (id) => {
    if (!window.confirm('Are you sure you want to remove this supplier?')) return;
    try {
      await api.delete(`/suppliers/${id}`);
      fetchSuppliers();
    } catch (err) {
      console.error('Failed to delete supplier', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Inventory & Procurement</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage stock catalog, receive supplier purchase orders, and track lens lab payables
          </p>
        </div>

        {/* Action Button for Active Tab */}
        <div className="flex gap-2">
          {activeTab === 'inventory' && (
            <button
              onClick={() => {
                setEditingProduct(null);
                setIsProductModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition"
            >
              <Plus className="w-4 h-4" /> Add Product
            </button>
          )}

          {activeTab === 'purchases' && (
            <button
              onClick={() => setIsPoModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition"
            >
              <Truck className="w-4 h-4" /> Inward Stock / PO
            </button>
          )}

          {activeTab === 'suppliers' && (
            <button
              onClick={() => {
                setEditingSupplier(null);
                setIsSupplierModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition"
            >
              <Building2 className="w-4 h-4" /> Add Supplier / Lab
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-5 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
            activeTab === 'inventory'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Package className="w-4 h-4" />
          Stock Catalog ({products.length})
        </button>

        <button
          onClick={() => setActiveTab('purchases')}
          className={`px-5 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
            activeTab === 'purchases'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Truck className="w-4 h-4" />
          Purchase Orders & Inward ({purchaseOrders.length})
        </button>

        <button
          onClick={() => setActiveTab('suppliers')}
          className={`px-5 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
            activeTab === 'suppliers'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Suppliers & Labs ({suppliers.length})
        </button>
      </div>

      {/* TAB 1: STOCK INVENTORY */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by item name, brand, model..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
              >
                <option value="">All Categories</option>
                <option value="FRAME">Frames</option>
                <option value="LENS">Lenses</option>
                <option value="SUNGLASSES">Sunglasses</option>
                <option value="CONTACT_LENS">Contact Lenses</option>
                <option value="SOLUTION">Solutions</option>
                <option value="ACCESSORY">Accessories</option>
              </select>

              <button
                onClick={() => setLowStockOnly(!lowStockOnly)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition ${
                  lowStockOnly
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                Low Stock Alert
              </button>
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loadingProducts ? (
              <SkeletonTable rows={6} cols={6} />
            ) : products.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                  <Glasses className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-700">No products found</p>
                <p className="text-xs text-slate-400">Add a product or log an inward stock purchase order.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Item & Brand</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Model / Code</th>
                      <th className="py-3 px-4 text-right">Selling Price</th>
                      <th className="py-3 px-4 text-center">Stock In Hand</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {products.map((p) => {
                      const isLow = p.stock_quantity <= p.min_stock_alert;
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{p.name}</div>
                            {p.brand && <div className="text-[11px] text-indigo-600 font-medium">{p.brand}</div>}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                              {p.item_type}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500">
                            {p.model_code || '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            ₹{parseFloat(p.selling_price).toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleAdjustStock(p.id, -1)}
                                title="Decrease stock by 1"
                                className="text-slate-400 hover:text-slate-700"
                              >
                                <MinusCircle className="w-4 h-4" />
                              </button>
                              <span
                                className={`px-2.5 py-0.5 rounded-full font-mono font-bold text-xs ${
                                  isLow
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-emerald-100 text-emerald-700'
                                }`}
                              >
                                {p.stock_quantity}
                              </span>
                              <button
                                onClick={() => handleAdjustStock(p.id, 1)}
                                title="Increase stock by 1"
                                className="text-slate-400 hover:text-indigo-600"
                              >
                                <PlusCircle className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <button
                              onClick={() => {
                                setEditingProduct(p);
                                setIsProductModalOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PURCHASE ORDERS & INWARD STOCK */}
      {activeTab === 'purchases' && (
        <div className="space-y-4">
          {/* Outstanding Payables Banner */}
          {duesSummary && parseFloat(duesSummary.total_outstanding_payables) > 0 && (
            <div className="bg-amber-500/10 border border-amber-300/60 p-4 rounded-2xl flex justify-between items-center text-amber-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                  ₹
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-800">Total Outstanding Vendor Payables</div>
                  <div className="text-2xl font-mono font-black text-amber-950">
                    ₹{parseFloat(duesSummary.total_outstanding_payables).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
              <div className="text-xs text-amber-800 text-right">
                Pending across {duesSummary.unpaid_po_count} purchase orders
              </div>
            </div>
          )}

          {/* POs Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loadingPurchases ? (
              <SkeletonTable rows={5} cols={6} />
            ) : purchaseOrders.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                  <Truck className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-700">No purchase orders logged yet</p>
                <p className="text-xs text-slate-400">Click "Inward Stock / PO" to receive goods from your lens labs and frame suppliers.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">PO # / Bill #</th>
                      <th className="py-3 px-4">Supplier / Lab</th>
                      <th className="py-3 px-4">Inward Date</th>
                      <th className="py-3 px-4 text-center">Items</th>
                      <th className="py-3 px-4 text-right">Total Cost</th>
                      <th className="py-3 px-4 text-right">Paid Amount</th>
                      <th className="py-3 px-4 text-right">Balance Due</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {purchaseOrders.map((po) => {
                      const balanceDue = parseFloat(po.balance_due || 0);
                      const isSettled = balanceDue <= 0;

                      return (
                        <tr key={po.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4">
                            <div className="font-mono font-bold text-indigo-600">{po.po_number}</div>
                            {po.invoice_number && (
                              <div className="text-[10px] text-slate-400 font-mono">Bill: {po.invoice_number}</div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{po.supplier_name}</div>
                            <div className="text-[10px] text-slate-400">{po.supplier_category?.replace('_', ' ')}</div>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500">
                            {new Date(po.order_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-semibold">
                            {po.items_count || 1} items
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            ₹{parseFloat(po.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-600 font-semibold">
                            ₹{parseFloat(po.paid_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold">
                            <span className={isSettled ? 'text-emerald-600' : 'text-amber-600'}>
                              ₹{balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {!isSettled && (
                              <button
                                onClick={() => {
                                  setSelectedPoForPayment(po);
                                  setIsPaymentModalOpen(true);
                                }}
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold rounded-lg border border-amber-200 transition inline-flex items-center gap-1"
                              >
                                <DollarSign className="w-3.5 h-3.5" /> Pay Due
                              </button>
                            )}
                            {isSettled && (
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md">
                                Fully Paid
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SUPPLIERS & LENS LABS */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          {/* Supplier filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search vendor by name, phone, GSTIN..."
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <select
              value={supplierCategory}
              onChange={(e) => setSupplierCategory(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
            >
              <option value="ALL">All Supplier Types</option>
              <option value="LENS_LAB">Lens Labs</option>
              <option value="FRAME_VENDOR">Frame Vendors</option>
              <option value="CONTACT_LENS">Contact Lens Vendors</option>
              <option value="ACCESSORIES">Accessories</option>
              <option value="GENERAL">General</option>
            </select>
          </div>

          {/* Suppliers Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loadingSuppliers ? (
              <SkeletonTable rows={5} cols={6} />
            ) : suppliers.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                  <Building2 className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-700">No suppliers registered</p>
                <p className="text-xs text-slate-400">Click "Add Supplier / Lab" to add your lens fitting laboratories and frame manufacturers.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Supplier / Lab</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Contact Person & Phone</th>
                      <th className="py-3 px-4">GSTIN</th>
                      <th className="py-3 px-4 text-center">Orders</th>
                      <th className="py-3 px-4 text-right">Balance Due</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {suppliers.map((s) => {
                      const balanceDue = parseFloat(s.balance_due || 0);

                      return (
                        <tr key={s.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{s.name}</div>
                            {s.address && <div className="text-[10px] text-slate-400 truncate max-w-xs">{s.address}</div>}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase">
                              {s.category?.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-800">{s.contact_person || '—'}</div>
                            {s.phone && (
                              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" /> {s.phone}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-600">
                            {s.gstin || '—'}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-semibold">
                            {s.po_count || 0} POs
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold">
                            <span className={balanceDue > 0 ? 'text-amber-600' : 'text-slate-400'}>
                              ₹{balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <button
                              onClick={() => {
                                setEditingSupplier(s);
                                setIsSupplierModalOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSupplier(s.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Product Modal */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        productToEdit={editingProduct}
        onSaved={fetchProducts}
      />

      {/* Supplier Modal */}
      <SupplierModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        supplierToEdit={editingSupplier}
        onSupplierSaved={() => {
          fetchSuppliers();
        }}
      />

      {/* Purchase Order Inward Modal */}
      <NewPurchaseOrderModal
        isOpen={isPoModalOpen}
        onClose={() => setIsPoModalOpen(false)}
        onPurchaseCreated={() => {
          fetchPurchaseOrders();
          fetchProducts();
          fetchSuppliers();
        }}
        onOpenAddSupplier={() => {
          setEditingSupplier(null);
          setIsSupplierModalOpen(true);
        }}
      />

      {/* Supplier Payment Modal */}
      <RecordSupplierPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedPoForPayment(null);
        }}
        purchaseOrder={selectedPoForPayment}
        onPaymentRecorded={() => {
          fetchPurchaseOrders();
          fetchSuppliers();
        }}
      />
    </div>
  );
}